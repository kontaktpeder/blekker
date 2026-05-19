
create extension if not exists "pgcrypto";

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  original_key text,
  bpm integer,
  capo integer default 0,
  source_url text,
  raw_input text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.arrangements (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  version integer not null default 1,
  current_key text,
  structure jsonb not null default '[]'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  band_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index arrangements_song_id_idx on public.arrangements(song_id);

create table public.setlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.setlist_songs (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  arrangement_id uuid not null references public.arrangements(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index setlist_songs_setlist_id_idx on public.setlist_songs(setlist_id, position);

-- updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger songs_touch before update on public.songs
for each row execute function public.touch_updated_at();
create trigger arrangements_touch before update on public.arrangements
for each row execute function public.touch_updated_at();
create trigger setlists_touch before update on public.setlists
for each row execute function public.touch_updated_at();

-- RLS: enable + permissive policies for MVP (no auth yet)
alter table public.songs enable row level security;
alter table public.arrangements enable row level security;
alter table public.setlists enable row level security;
alter table public.setlist_songs enable row level security;

create policy "songs are public" on public.songs for select using (true);
create policy "songs insert open" on public.songs for insert with check (true);
create policy "songs update open" on public.songs for update using (true) with check (true);
create policy "songs delete open" on public.songs for delete using (true);

create policy "arr are public" on public.arrangements for select using (true);
create policy "arr insert open" on public.arrangements for insert with check (true);
create policy "arr update open" on public.arrangements for update using (true) with check (true);
create policy "arr delete open" on public.arrangements for delete using (true);

create policy "sl are public" on public.setlists for select using (true);
create policy "sl insert open" on public.setlists for insert with check (true);
create policy "sl update open" on public.setlists for update using (true) with check (true);
create policy "sl delete open" on public.setlists for delete using (true);

create policy "sls are public" on public.setlist_songs for select using (true);
create policy "sls insert open" on public.setlist_songs for insert with check (true);
create policy "sls update open" on public.setlist_songs for update using (true) with check (true);
create policy "sls delete open" on public.setlist_songs for delete using (true);
