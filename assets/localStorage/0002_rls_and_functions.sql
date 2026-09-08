-- =============================================================================
-- HourlyTV — migration 0002 : RLS + fonctions security definer
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.video_reactions enable row level security;
alter table public.video_saves enable row level security;
alter table public.video_favorites enable row level security;
alter table public.video_shares enable row level security;
alter table public.subscriptions enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profils visibles par tous" on public.profiles
  for select using (true);

create policy "un usager modifie seulement son propre profil" on public.profiles
  for update using (auth.uid() = id);

-- Création automatique du profil à l'inscription (trigger security definer,
-- comme sur Roman-Sadcifer / JFKforum).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', 'Nouvel usager'),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- videos : la visibilité gère qui peut lire
-- ---------------------------------------------------------------------------
create policy "lecture vidéos publiques ou non répertoriées" on public.videos
  for select using (
    visibility in ('public', 'non_repertorie')
    or owner_id = auth.uid()
    or (
      visibility = 'liste_privee'
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
        and p.username = any (private_list_usernames)
      )
    )
  );

create policy "un usager crée ses propres vidéos" on public.videos
  for insert with check (owner_id = auth.uid());

-- Fonction utilitaire : vérifie le rôle modérateur (définie avant les
-- politiques qui l'utilisent)
create or replace function public.is_moderator(uid uuid)
returns boolean
language sql
security definer set search_path = public
as $$
  select coalesce((select is_moderator from public.profiles where id = uid), false);
$$;

create policy "un usager modifie ses propres vidéos" on public.videos
  for update using (owner_id = auth.uid() or public.is_moderator(auth.uid()));

-- ---------------------------------------------------------------------------
-- réactions / saves / favoris / partages / abonnements
-- ---------------------------------------------------------------------------
create policy "réactions visibles par tous" on public.video_reactions for select using (true);
create policy "un usager gère sa propre réaction" on public.video_reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "un usager gère ses propres enregistrements" on public.video_saves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "un usager gère ses propres favoris" on public.video_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "partages visibles par tous" on public.video_shares for select using (true);
create policy "un usager connecté peut partager" on public.video_shares
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "abonnements visibles par tous" on public.subscriptions for select using (true);
create policy "un usager gère ses propres abonnements" on public.subscriptions
  for all using (auth.uid() = subscriber_id) with check (auth.uid() = subscriber_id);

-- ---------------------------------------------------------------------------
-- commentaires
-- ---------------------------------------------------------------------------
create policy "commentaires visibles selon la vidéo" on public.comments
  for select using (
    exists (
      select 1 from public.videos v
      where v.id = video_id
      and (v.visibility in ('public','non_repertorie') or v.owner_id = auth.uid())
    )
  );
create policy "un usager connecté peut commenter" on public.comments
  for insert with check (auth.uid() = user_id);
create policy "un usager supprime ses propres commentaires" on public.comments
  for delete using (auth.uid() = user_id or public.is_moderator(auth.uid()));

-- ---------------------------------------------------------------------------
-- notifications : privées à chacun
-- ---------------------------------------------------------------------------
create policy "notifications privées" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications marquées lues par leur destinataire" on public.notifications
  for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Compteur de vues (RPC, appelé une fois le seuil de 1% franchi côté client)
-- ---------------------------------------------------------------------------
create or replace function public.increment_video_view(p_video_id text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.videos set views = views + 1 where id = p_video_id;
end;
$$;

-- Applique un like/dislike et garde les compteurs `videos.likes/dislikes` à jour
create or replace function public.set_video_reaction(p_video_id text, p_is_like boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  previous boolean;
begin
  select is_like into previous from public.video_reactions
    where video_id = p_video_id and user_id = auth.uid();

  if previous is not null then
    if previous then update public.videos set likes = likes - 1 where id = p_video_id;
    else update public.videos set dislikes = dislikes - 1 where id = p_video_id; end if;
  end if;

  insert into public.video_reactions (video_id, user_id, is_like, updated_at)
  values (p_video_id, auth.uid(), p_is_like, now())
  on conflict (video_id, user_id) do update set is_like = p_is_like, updated_at = now();

  if p_is_like is not null then
    if p_is_like then update public.videos set likes = likes + 1 where id = p_video_id;
    else update public.videos set dislikes = dislikes + 1 where id = p_video_id; end if;
  end if;
end;
$$;
