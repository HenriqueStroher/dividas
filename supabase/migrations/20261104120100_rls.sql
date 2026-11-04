-- Row Level Security: cada usuário só acessa os próprios registros.

alter table public.people enable row level security;
alter table public.debts enable row level security;
alter table public.debt_shares enable row level security;

create policy "people: somente o dono" on public.people
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "debts: somente o dono" on public.debts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "debt_shares: somente o dono" on public.debt_shares
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.people, public.debts, public.debt_shares from anon, public;
grant select, insert, update, delete on public.people, public.debts, public.debt_shares to authenticated;
