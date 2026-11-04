-- Exclui uma pessoa sem nada pendente, junto com o histórico dela. Roda como o usuário
-- autenticado (security invoker), portanto continua sujeita ao RLS.
-- Dívida só dela é removida. Dívida dividida continua para as outras pessoas, com os mesmos
-- valores: o total passa a ser a soma do que restou, e editar depois não muda as partes.

create function public.delete_person(p_person_id uuid) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_debt_ids uuid[];
begin
  -- A trava faz qualquer nova parte desta pessoa esperar até o fim da exclusão (a FK depende dela).
  perform 1 from public.people where id = p_person_id for update;

  if not found then
    raise exception 'Pessoa não encontrada' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.debt_shares where person_id = p_person_id and paid_at is null
  ) then
    raise exception 'A pessoa ainda tem dívidas pendentes' using errcode = 'DV001';
  end if;

  with removed as (
    delete from public.debt_shares where person_id = p_person_id returning debt_id
  )
  select coalesce(array_agg(debt_id), '{}') into v_debt_ids from removed;

  delete from public.debts as d
  where d.id = any (v_debt_ids)
    and not exists (select 1 from public.debt_shares as s where s.debt_id = d.id);

  update public.debts as d
  set total_cents = d.self_share_cents + (
        select sum(s.amount_cents)::bigint from public.debt_shares as s where s.debt_id = d.id
      ),
      updated_at = now()
  where d.id = any (v_debt_ids);

  delete from public.people where id = p_person_id;
end;
$$;

revoke all on function public.delete_person(uuid) from public, anon;
grant execute on function public.delete_person(uuid) to authenticated;
