-- Why: guesses that mean the same thing merge into one cluster (spec: Guess clustering).
-- A cluster is its first guess, the head: heads have no cluster_id, every other
-- guess in the cluster points at its head, and drawings only hang off heads.

begin;

alter table public.guesses
  add column if not exists cluster_id bigint;

alter table public.guesses
  drop constraint if exists guesses_cluster_same_day_fkey;
alter table public.guesses
  add constraint guesses_cluster_same_day_fkey
  foreign key (day_id, cluster_id)
  references public.guesses (day_id, id)
  on delete cascade;

alter table public.guesses
  drop constraint if exists guesses_cluster_not_self_check;
alter table public.guesses
  add constraint guesses_cluster_not_self_check
  check (cluster_id is distinct from id);

create index if not exists guesses_cluster_id_idx
  on public.guesses (cluster_id);

-- The head must be a head and must be a guess of the same drawing.
create or replace function public.check_guess_cluster()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.cluster_id is null then
    return new;
  end if;

  if not exists (
    select 1
      from public.guesses as head
      where head.id = new.cluster_id
        and head.drawing_id = new.drawing_id
        and head.cluster_id is null
  ) then
    raise exception 'a guess can only join a cluster head on the same drawing'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' and (
    exists (
      select 1 from public.guesses as member where member.cluster_id = new.id
    )
    or exists (
      select 1 from public.drawings as child where child.parent_guess_id = new.id
    )
  ) then
    raise exception 'a cluster head with members or drawings cannot join another cluster'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists guesses_check_cluster on public.guesses;
create trigger guesses_check_cluster
  before insert or update of cluster_id on public.guesses
  for each row execute function public.check_guess_cluster();

-- A drawing is a drawing of a cluster, so its parent guess must be a head.
create or replace function public.check_drawing_parent_is_cluster_head()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_guess_id is not null and exists (
    select 1
      from public.guesses as parent
      where parent.id = new.parent_guess_id
        and parent.cluster_id is not null
  ) then
    raise exception 'a drawing must hang off a cluster head'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists drawings_check_parent_cluster_head on public.drawings;
create trigger drawings_check_parent_cluster_head
  before insert on public.drawings
  for each row execute function public.check_drawing_parent_is_cluster_head();

commit;
