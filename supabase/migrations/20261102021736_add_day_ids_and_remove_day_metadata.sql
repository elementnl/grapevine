-- Why: use stable day IDs for tree references and remove unused day metadata.

begin;

alter table public.days
  add column if not exists id uuid default gen_random_uuid();
update public.days
  set id = gen_random_uuid()
  where id is null;
alter table public.days
  alter column id set default gen_random_uuid();
alter table public.days
  alter column id set not null;
create unique index if not exists days_id_key on public.days (id);

alter table public.drawings
  add column if not exists day_id uuid;
alter table public.guesses
  add column if not exists day_id uuid;

update public.drawings as drawings
  set day_id = days.id
  from public.days as days
  where drawings.day = days.date
    and drawings.day_id is null;
update public.guesses as guesses
  set day_id = days.id
  from public.days as days
  where guesses.day = days.date
    and guesses.day_id is null;

alter table public.drawings
  alter column day_id set not null;
alter table public.guesses
  alter column day_id set not null;

create unique index if not exists drawings_day_id_id_key
  on public.drawings (day_id, id);
create unique index if not exists guesses_day_id_id_key
  on public.guesses (day_id, id);

alter table public.drawings
  drop constraint if exists drawings_day_id_fkey;
alter table public.drawings
  add constraint drawings_day_id_fkey
  foreign key (day_id)
  references public.days (id)
  on delete cascade;

alter table public.guesses
  drop constraint if exists guesses_day_id_fkey;
alter table public.guesses
  add constraint guesses_day_id_fkey
  foreign key (day_id)
  references public.days (id)
  on delete cascade;

alter table public.guesses
  drop constraint if exists guesses_drawing_same_day_fkey;
alter table public.guesses
  add constraint guesses_drawing_same_day_fkey
  foreign key (day_id, drawing_id)
  references public.drawings (day_id, id)
  on delete cascade;

alter table public.drawings
  drop constraint if exists drawings_parent_guess_same_day_fkey;
alter table public.drawings
  add constraint drawings_parent_guess_same_day_fkey
  foreign key (day_id, parent_guess_id)
  references public.guesses (day_id, id)
  on delete cascade;

alter table public.drawings
  drop constraint if exists drawings_day_fkey;
alter table public.guesses
  drop constraint if exists guesses_day_fkey;

create index if not exists drawings_day_id_status_depth_idx
  on public.drawings (day_id, status, depth);
create index if not exists drawings_day_id_parent_guess_idx
  on public.drawings (day_id, parent_guess_id);
create index if not exists guesses_day_id_drawing_idx
  on public.guesses (day_id, drawing_id);
create index if not exists guesses_day_id_depth_idx
  on public.guesses (day_id, depth);

create or replace function public.sync_drawing_day_id()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  resolved_date date;
  resolved_day_id uuid;
begin
  if new.day_id is null then
    select days.id
      into resolved_day_id
      from public.days as days
      where days.date = new.day;

    if not found then
      raise exception 'the drawing day does not exist'
        using errcode = 'foreign_key_violation';
    end if;

    new.day_id := resolved_day_id;
  else
    select days.date
      into resolved_date
      from public.days as days
      where days.id = new.day_id;

    if not found then
      raise exception 'the drawing day does not exist'
        using errcode = 'foreign_key_violation';
    end if;

    if new.day is not null and new.day is distinct from resolved_date then
      raise exception 'drawing day and day_id do not match'
        using errcode = 'check_violation';
    end if;

    new.day := resolved_date;
  end if;

  return new;
end;
$$;

create or replace function public.sync_guess_day_id()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  resolved_date date;
  resolved_day_id uuid;
begin
  if new.day_id is null then
    select days.id
      into resolved_day_id
      from public.days as days
      where days.date = new.day;

    if not found then
      raise exception 'the guess day does not exist'
        using errcode = 'foreign_key_violation';
    end if;

    new.day_id := resolved_day_id;
  else
    select days.date
      into resolved_date
      from public.days as days
      where days.id = new.day_id;

    if not found then
      raise exception 'the guess day does not exist'
        using errcode = 'foreign_key_violation';
    end if;

    if new.day is not null and new.day is distinct from resolved_date then
      raise exception 'guess day and day_id do not match'
        using errcode = 'check_violation';
    end if;

    new.day := resolved_date;
  end if;

  return new;
end;
$$;

drop trigger if exists drawings_a_sync_day_id on public.drawings;
create trigger drawings_a_sync_day_id
  before insert or update on public.drawings
  for each row execute function public.sync_drawing_day_id();

drop trigger if exists guesses_a_sync_day_id on public.guesses;
create trigger guesses_a_sync_day_id
  before insert or update on public.guesses
  for each row execute function public.sync_guess_day_id();

alter table public.days
  drop column if exists metadata;

commit;