-- Why: record how close each guess was to its nearest neighbour on the same
-- drawing, joined or not, so the clustering threshold can be tuned from real
-- data (spec: Guess clustering, Open questions).

begin;

alter table public.guesses
  add column if not exists similarity real;

commit;
