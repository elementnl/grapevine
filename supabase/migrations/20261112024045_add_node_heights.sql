-- Why: assignment weights nodes by height, their distance from the bottom of
-- their branch (spec: Assignment algorithm). 0 is a leaf. On guesses only the
-- cluster head's height means anything; members are not a level of the tree.

begin;

alter table public.drawings
  add column if not exists height integer not null default 0
  check (height >= 0);
alter table public.guesses
  add column if not exists height integer not null default 0
  check (height >= 0);

-- A new leaf can only raise its ancestors' heights, so walk up from its parent
-- and stop at the first one that is already tall enough.
-- ponytail: deletes never lower heights; prunes are rare, recompute if it matters.
create or replace function public.raise_ancestor_heights()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_kind text;
  parent_id bigint;
  next_id bigint;
  child_height integer := new.height;
begin
  if tg_table_name = 'guesses' then
    if new.cluster_id is not null then
      return null;
    end if;
    parent_kind := 'drawing';
    parent_id := new.drawing_id;
  else
    if new.parent_guess_id is null then
      return null;
    end if;
    parent_kind := 'guess';
    parent_id := new.parent_guess_id;
  end if;

  loop
    child_height := child_height + 1;

    if parent_kind = 'guess' then
      update public.guesses
        set height = child_height
        where id = parent_id and height < child_height
        returning drawing_id into next_id;
      exit when not found;
      parent_kind := 'drawing';
    else
      update public.drawings
        set height = child_height
        where id = parent_id and height < child_height
        returning parent_guess_id into next_id;
      exit when not found or next_id is null;
      parent_kind := 'guess';
    end if;

    parent_id := next_id;
  end loop;

  return null;
end;
$$;

drop trigger if exists drawings_raise_ancestor_heights on public.drawings;
create trigger drawings_raise_ancestor_heights
  after insert on public.drawings
  for each row execute function public.raise_ancestor_heights();

drop trigger if exists guesses_raise_ancestor_heights on public.guesses;
create trigger guesses_raise_ancestor_heights
  after insert on public.guesses
  for each row execute function public.raise_ancestor_heights();

-- Backfill bottom-up: each level takes 1 + its tallest child, so by the time a
-- level is set, every level below it already is.
do $$
declare
  level integer;
  max_depth integer;
begin
  select max(depth)
    into max_depth
    from (
      select depth from public.drawings
      union all
      select depth from public.guesses
    ) as nodes;

  for level in reverse coalesce(max_depth, 0)..1 loop
    update public.guesses as head
      set height = children.height
      from (
        select parent_guess_id as id, max(height) + 1 as height
          from public.drawings
          where parent_guess_id is not null
          group by parent_guess_id
      ) as children
      where head.id = children.id
        and head.depth = level
        and head.height is distinct from children.height;

    update public.drawings as drawing
      set height = children.height
      from (
        select drawing_id as id, max(height) + 1 as height
          from public.guesses
          where cluster_id is null
          group by drawing_id
      ) as children
      where drawing.id = children.id
        and drawing.depth = level
        and drawing.height is distinct from children.height;
  end loop;
end;
$$;

commit;
