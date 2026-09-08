-- =============================================================================
-- HourlyTV — migration 0003 : modération, sécurité, quotas
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Historique de connexion (rempli par l'edge function record-login, jamais
-- par le navigateur directement — un client JS ne peut pas connaître sa
-- vraie IP publique de façon fiable).
-- ---------------------------------------------------------------------------
create table if not exists public.login_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ip text,
  location text,
  device text,
  created_at timestamptz not null default now()
);
alter table public.login_connections enable row level security;
create policy "un usager voit ses propres connexions" on public.login_connections
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Codes de réinitialisation de mot de passe (5 chiffres, expirent après 10 min)
-- ---------------------------------------------------------------------------
create table if not exists public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.password_reset_codes enable row level security;
-- Aucune policy select/insert publique : uniquement accessible via les
-- edge functions (clé service_role), jamais depuis le navigateur.

-- ---------------------------------------------------------------------------
-- Quota horaire d'envoi email/SMS (partagé par fournisseur)
-- ---------------------------------------------------------------------------
create table if not exists public.send_quota (
  channel text primary key check (channel in ('email', 'sms')),
  window_start timestamptz not null default now(),
  sent_count integer not null default 0
);
insert into public.send_quota (channel) values ('email'), ('sms')
  on conflict (channel) do nothing;

create or replace function public.check_and_consume_quota(p_channel text, p_hourly_limit integer default 50)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  row_data record;
begin
  select * into row_data from public.send_quota where channel = p_channel for update;
  if now() - row_data.window_start > interval '1 hour' then
    update public.send_quota set window_start = now(), sent_count = 1 where channel = p_channel;
    return true;
  end if;
  if row_data.sent_count >= p_hourly_limit then
    return false;
  end if;
  update public.send_quota set sent_count = sent_count + 1 where channel = p_channel;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Signalements de contenu
-- ---------------------------------------------------------------------------
create type public.report_status as enum ('ouvert', 'traite', 'rejete');

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  video_id text references public.videos(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  status public.report_status not null default 'ouvert',
  created_at timestamptz not null default now()
);
alter table public.moderation_reports enable row level security;
create policy "modérateurs voient tous les signalements" on public.moderation_reports
  for select using (public.is_moderator(auth.uid()));
create policy "n'importe quel usager connecté peut signaler" on public.moderation_reports
  for insert with check (auth.uid() = reporter_id);
create policy "modérateurs traitent les signalements" on public.moderation_reports
  for update using (public.is_moderator(auth.uid()));

-- Bannissement / expulsion
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists banned_reason text;

create or replace function public.mod_ban_user(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_moderator(auth.uid()) then
    raise exception 'Action réservée aux modérateurs.';
  end if;
  update public.profiles set is_banned = true, banned_reason = p_reason where id = p_user_id;
end;
$$;

create or replace function public.mod_set_video_status(p_video_id text, p_status public.moderation_status)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_moderator(auth.uid()) then
    raise exception 'Action réservée aux modérateurs.';
  end if;
  update public.videos set moderation_status = p_status where id = p_video_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Console SQL modérateur — JOURNALISÉE et RESTREINTE
--
-- ATTENTION SÉCURITÉ (à lire avant d'activer cette fonction) :
-- Cette fonction exécute du SQL arbitraire fourni par un modérateur. C'est
-- une fonctionnalité puissante et risquée même entre mains de confiance :
-- une seule requête mal écrite (DROP, DELETE sans WHERE...) est irréversible.
-- Recommandations fortes :
--   1) Limiter `is_moderator = true` à un tout petit nombre de comptes.
--   2) Envisager une variante en lecture seule (voir mod_execute_sql_readonly
--      ci-dessous) pour l'usage courant, et réserver l'écriture à des cas
--      exceptionnels.
--   3) Chaque requête est journalisée dans mod_sql_log avec l'identité de
--      l'exécutant — à consulter régulièrement.
--   4) Ne JAMAIS exposer cette RPC à autre chose que l'espace modération,
--      et toujours vérifier is_moderator côté serveur (fait ci-dessous),
--      jamais seulement côté client.
-- ---------------------------------------------------------------------------
create table if not exists public.mod_sql_log (
  id uuid primary key default gen_random_uuid(),
  executed_by uuid references public.profiles(id),
  query text not null,
  error text,
  created_at timestamptz not null default now()
);
alter table public.mod_sql_log enable row level security;
create policy "modérateurs consultent le journal" on public.mod_sql_log
  for select using (public.is_moderator(auth.uid()));

create or replace function public.mod_execute_sql(p_query text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  result jsonb;
  err text;
begin
  if not public.is_moderator(auth.uid()) then
    raise exception 'Action réservée aux modérateurs.';
  end if;

  begin
    execute format('select coalesce(jsonb_agg(t), ''[]''::jsonb) from (%s) t', p_query) into result;
  exception when others then
    err := SQLERRM;
    insert into public.mod_sql_log (executed_by, query, error) values (auth.uid(), p_query, err);
    raise exception '%', err;
  end;

  insert into public.mod_sql_log (executed_by, query) values (auth.uid(), p_query);
  return result;
end;
$$;

-- Variante lecture seule recommandée pour l'usage quotidien : rejette tout
-- ce qui n'est pas un SELECT.
create or replace function public.mod_execute_sql_readonly(p_query text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_moderator(auth.uid()) then
    raise exception 'Action réservée aux modérateurs.';
  end if;
  if p_query !~* '^\s*select' then
    raise exception 'Lecture seule : seules les requêtes SELECT sont autorisées ici.';
  end if;
  return public.mod_execute_sql(p_query);
end;
$$;
