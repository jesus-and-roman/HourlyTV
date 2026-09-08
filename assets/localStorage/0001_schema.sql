-- =============================================================================
-- HourlyTV — migration 0001 : schéma de base
-- Additive uniquement. À exécuter dans l'éditeur SQL Supabase, dans l'ordre
-- des fichiers numérotés (0001, 0002, 0003...).
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profils (1-1 avec auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  username text unique not null,
  bio text default '',
  birthdate date,
  banner_url text,
  pfp_url text,
  phone text,
  is_moderator boolean not null default false,
  is_premium boolean not null default false,
  last_nickname_change timestamptz not null default now(),
  last_username_change timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Vidéos
-- ---------------------------------------------------------------------------
create type public.video_visibility as enum ('public', 'non_repertorie', 'prive', 'liste_privee');
create type public.moderation_status as enum ('en_attente', 'approuvee', 'rejetee');

create table if not exists public.videos (
  id text primary key, -- 9 caractères a-z A-Z 0-9, généré par generate_video_id()
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) <= 50),
  description text not null default '' check (char_length(description) <= 1000),
  hashtags text[] not null default '{}' check (array_length(hashtags, 1) is null or array_length(hashtags, 1) <= 8),
  duration_seconds integer not null default 0,
  gofile_file_id text,
  gofile_download_page text,
  banner_gofile_id text,
  color_1 text, -- famille de couleur dominante ("vert", "bleu"...)
  color_2 text,
  color_3 text,
  visibility public.video_visibility not null default 'public',
  private_list_usernames text[] not null default '{}',
  allow_referencing boolean not null default true,
  views bigint not null default 0,
  likes bigint not null default 0,
  dislikes bigint not null default 0,
  moderation_status public.moderation_status not null default 'en_attente',
  created_at timestamptz not null default now()
);

create index if not exists idx_videos_owner on public.videos(owner_id);
create index if not exists idx_videos_visibility on public.videos(visibility);
create index if not exists idx_videos_hashtags on public.videos using gin(hashtags);

-- Génère un identifiant unique de 9 caractères [a-zA-Z0-9] pour /?={id}
create or replace function public.generate_video_id()
returns text
language plpgsql
as $$
declare
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
begin
  loop
    result := '';
    for i in 1..9 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.videos where id = result);
  end loop;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Actions manuelles (like/dislike, enregistrement, favoris, partage, abonnement)
-- ---------------------------------------------------------------------------
create table if not exists public.video_reactions (
  video_id text not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_like boolean, -- true = like, false = dislike, null = neutre
  updated_at timestamptz not null default now(),
  primary key (video_id, user_id)
);

create table if not exists public.video_saves (
  video_id text not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);

create table if not exists public.video_favorites (
  video_id text not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);

create table if not exists public.video_shares (
  video_id text not null references public.videos(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  subscriber_id uuid not null references public.profiles(id) on delete cascade,
  channel_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, channel_id)
);

-- ---------------------------------------------------------------------------
-- Commentaires
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id text not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_video on public.comments(video_id);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read);
