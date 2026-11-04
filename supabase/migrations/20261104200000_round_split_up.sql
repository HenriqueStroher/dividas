-- Quando a divisão não dá exata, cada parte é arredondada para cima (R$ 100 / 3 = R$ 33,34
-- para cada um), mesmo que a soma passe do total.

create or replace function public.assert_valid_shares(
  p_total_cents bigint,
  p_self_share_cents bigint,
  p_shares jsonb
) returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_parts int;
  v_expected bigint;
begin
  if jsonb_typeof(p_shares) is distinct from 'array' or jsonb_array_length(p_shares) = 0 then
    raise exception 'A dívida precisa de ao menos uma pessoa' using errcode = '22023';
  end if;

  v_parts := jsonb_array_length(p_shares) + case when p_self_share_cents > 0 then 1 else 0 end;

  if p_total_cents < v_parts then
    raise exception 'O total não cobre um centavo para cada parte' using errcode = '22023';
  end if;

  v_expected := ceil(p_total_cents::numeric / v_parts);

  if (p_self_share_cents > 0 and p_self_share_cents <> v_expected)
    or exists (
      select 1
      from jsonb_array_elements(p_shares) as share
      where (share ->> 'amount_cents')::bigint is distinct from v_expected
    )
  then
    raise exception 'Todas as partes precisam valer % centavos', v_expected using errcode = '22023';
  end if;
end;
$$;
