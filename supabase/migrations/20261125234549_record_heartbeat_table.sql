-- Why: prod has a `heartbeat` table (one timestamp row, a keep-alive) that was
-- created outside the migrations. Recording it here makes a database built from
-- the migrations match prod. On prod this changes nothing.

begin;

create table if not exists public.heartbeat (
  last timestamptz not null default now()
);

alter table public.heartbeat enable row level security;

commit;
