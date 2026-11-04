-- Gravação atômica de uma dívida e suas partes. As funções rodam como o usuário
-- autenticado (security invoker), portanto continuam sujeitas ao RLS.
-- p_shares: [{ "person_id": uuid, "amount_cents": int }, ...], na ordem da divisão.

create function public.assert_valid_shares(
  p_total_cents bigint,
  p_self_share_cents bigint,
  p_shares jsonb
) returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_sum bigint;
begin
  if jsonb_typeof(p_shares) is distinct from 'array' or jsonb_array_length(p_shares) = 0 then
    raise exception 'A dívida precisa de ao menos uma pessoa' using errcode = '22023';
  end if;

  select sum((share ->> 'amount_cents')::bigint) into v_sum
  from jsonb_array_elements(p_shares) as share;

  if v_sum + p_self_share_cents <> p_total_cents then
    raise exception 'A soma das partes (%) difere do total (%)',
      v_sum + p_self_share_cents, p_total_cents using errcode = '22023';
  end if;
end;
$$;

create function public.create_debt(
  p_direction public.debt_direction,
  p_total_cents bigint,
  p_self_share_cents bigint,
  p_description text,
  p_occurred_on date,
  p_shares jsonb
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_debt_id uuid;
begin
  perform public.assert_valid_shares(p_total_cents, p_self_share_cents, p_shares);

  insert into public.debts (direction, total_cents, self_share_cents, description, occurred_on)
  values (p_direction, p_total_cents, p_self_share_cents, btrim(p_description), p_occurred_on)
  returning id into v_debt_id;

  insert into public.debt_shares (debt_id, person_id, amount_cents, position)
  select v_debt_id, (share ->> 'person_id')::uuid, (share ->> 'amount_cents')::bigint, ord - 1
  from jsonb_array_elements(p_shares) with ordinality as t (share, ord);

  return v_debt_id;
end;
$$;

-- Regra de edição: a parte continua paga somente se a pessoa continua na dívida,
-- o valor dela não mudou e o sentido da dívida não mudou. Caso contrário, volta a pendente.
create function public.update_debt(
  p_debt_id uuid,
  p_direction public.debt_direction,
  p_total_cents bigint,
  p_self_share_cents bigint,
  p_description text,
  p_occurred_on date,
  p_shares jsonb
) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_old_direction public.debt_direction;
begin
  perform public.assert_valid_shares(p_total_cents, p_self_share_cents, p_shares);

  select direction into v_old_direction
  from public.debts
  where id = p_debt_id
  for update;

  if not found then
    raise exception 'Dívida não encontrada' using errcode = 'P0002';
  end if;

  update public.debts
  set direction = p_direction,
      total_cents = p_total_cents,
      self_share_cents = p_self_share_cents,
      description = btrim(p_description),
      occurred_on = p_occurred_on,
      updated_at = now()
  where id = p_debt_id;

  delete from public.debt_shares
  where debt_id = p_debt_id
    and person_id not in (
      select (share ->> 'person_id')::uuid
      from jsonb_array_elements(p_shares) as share
    );

  insert into public.debt_shares (debt_id, person_id, amount_cents, position)
  select p_debt_id, (share ->> 'person_id')::uuid, (share ->> 'amount_cents')::bigint, ord - 1
  from jsonb_array_elements(p_shares) with ordinality as t (share, ord)
  on conflict (debt_id, person_id) do update
  set amount_cents = excluded.amount_cents,
      position = excluded.position,
      paid_at = case
        when public.debt_shares.amount_cents = excluded.amount_cents
          and v_old_direction = p_direction
        then public.debt_shares.paid_at
      end;
end;
$$;

revoke all on function public.assert_valid_shares(bigint, bigint, jsonb) from public, anon;
revoke all on function public.create_debt(public.debt_direction, bigint, bigint, text, date, jsonb) from public, anon;
revoke all on function public.update_debt(uuid, public.debt_direction, bigint, bigint, text, date, jsonb) from public, anon;

grant execute on function public.assert_valid_shares(bigint, bigint, jsonb) to authenticated;
grant execute on function public.create_debt(public.debt_direction, bigint, bigint, text, date, jsonb) to authenticated;
grant execute on function public.update_debt(uuid, public.debt_direction, bigint, bigint, text, date, jsonb) to authenticated;
