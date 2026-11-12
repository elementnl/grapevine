-- Why: every turn handed out is recorded, so turns used today are a count, an
-- expired turn can be refused, and nobody is given the same node twice
-- (spec: Assignment algorithm, Data model).

begin;

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  -- Exactly one: a drawing to guess, or a cluster head to draw.
  drawing_id bigint references public.drawings (id) on delete cascade,
  guess_id bigint references public.guesses (id) on delete cascade,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  -- Null while the turn is open.
  outcome text check (outcome in ('submitted', 'expired', 'rejected')),
  check (num_nonnulls(drawing_id, guess_id) = 1),
  check (expires_at > issued_at)
);

create unique index if not exists assignments_player_drawing_key
  on public.assignments (player_id, drawing_id);
create unique index if not exists assignments_player_guess_key
  on public.assignments (player_id, guess_id);
create index if not exists assignments_player_day_idx
  on public.assignments (player_id, day_id);
create index if not exists assignments_drawing_id_idx
  on public.assignments (drawing_id);
create index if not exists assignments_guess_id_idx
  on public.assignments (guess_id);

alter table public.assignments enable row level security;

commit;
