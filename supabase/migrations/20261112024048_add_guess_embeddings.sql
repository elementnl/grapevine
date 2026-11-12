-- Why: clustering compares a new guess with the other guesses of the same
-- drawing by embedding (spec: Guess clustering). Nullable: guesses made before
-- clustering, or while the embeddings API is down, have none.

begin;

create extension if not exists vector with schema extensions;

alter table public.guesses
  add column if not exists embedding extensions.vector(512);

commit;
