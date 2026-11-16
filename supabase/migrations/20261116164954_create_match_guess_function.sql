-- Why: clustering needs the guess on the same drawing whose embedding is
-- closest to a new guess, and the cluster it belongs to, in one query
-- (spec: Guess clustering).

begin;

create or replace function public.match_guess(
  target_drawing_id bigint,
  query_embedding extensions.vector(512)
)
returns table (head_id bigint, similarity double precision)
language sql
stable
set search_path = ''
as $$
  select
    coalesce(guess.cluster_id, guess.id),
    1 - (guess.embedding operator(extensions.<=>) query_embedding)
  from public.guesses as guess
  where guess.drawing_id = target_drawing_id
    and guess.embedding is not null
  order by guess.embedding operator(extensions.<=>) query_embedding
  limit 1;
$$;

-- Only the server, with the secret key, calls this.
revoke execute on function public.match_guess(bigint, extensions.vector)
  from public, anon, authenticated;

commit;
