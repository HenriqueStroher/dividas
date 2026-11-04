-- Views de leitura. security_invoker faz com que respeitem o RLS de quem consulta.

-- Saldo por pessoa, considerando somente partes pendentes.
create view public.person_balances
with (security_invoker = true) as
select
  p.id as person_id,
  p.name,
  coalesce(sum(s.amount_cents) filter (where d.direction = 'owed_to_me'), 0)::bigint as receivable_cents,
  coalesce(sum(s.amount_cents) filter (where d.direction = 'i_owe'), 0)::bigint as payable_cents,
  (
    coalesce(sum(s.amount_cents) filter (where d.direction = 'owed_to_me'), 0)
    - coalesce(sum(s.amount_cents) filter (where d.direction = 'i_owe'), 0)
  )::bigint as net_cents
from public.people p
left join public.debt_shares s on s.person_id = p.id and s.paid_at is null
left join public.debts d on d.id = s.debt_id
group by p.id, p.name;

-- Uma linha por parte, com os dados da dívida e da pessoa (histórico e busca).
create view public.debt_share_details
with (security_invoker = true) as
select
  s.id as share_id,
  s.debt_id,
  s.person_id,
  p.name as person_name,
  d.direction,
  s.amount_cents,
  d.total_cents,
  d.self_share_cents,
  d.description,
  d.occurred_on,
  d.created_at,
  s.paid_at
from public.debt_shares s
join public.debts d on d.id = s.debt_id
join public.people p on p.id = s.person_id;

revoke all on public.person_balances, public.debt_share_details from anon, public;
grant select on public.person_balances, public.debt_share_details to authenticated;
