-- Tabelas principais do app. Valores sempre em centavos (bigint).

create type public.debt_direction as enum ('i_owe', 'owed_to_me');

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  -- Alvo das FKs compostas de debt_shares.
  unique (id, user_id)
);

create unique index people_user_name_key on public.people (user_id, lower(btrim(name)));

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  direction public.debt_direction not null,
  total_cents bigint not null check (total_cents > 0),
  -- Parte do próprio usuário quando "me incluir" está ligado (0 = desligado).
  -- Não gera dívida: total_cents = self_share_cents + soma de debt_shares.amount_cents.
  self_share_cents bigint not null default 0 check (self_share_cents >= 0),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (self_share_cents < total_cents),
  unique (id, user_id)
);

create index debts_user_occurred_idx on public.debts (user_id, occurred_on desc);

create table public.debt_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  debt_id uuid not null,
  person_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  position smallint not null check (position >= 0),
  -- null = pendente; preenchido = paga.
  paid_at timestamptz,
  unique (debt_id, person_id),
  -- FKs compostas: a checagem de FK ignora RLS, então é o user_id na chave que
  -- impede vincular a parte à pessoa ou à dívida de outro usuário.
  foreign key (debt_id, user_id) references public.debts (id, user_id) on delete cascade,
  foreign key (person_id, user_id) references public.people (id, user_id) on delete restrict
);

create index debt_shares_person_idx on public.debt_shares (person_id, user_id);
create index debt_shares_debt_user_idx on public.debt_shares (debt_id, user_id);
create index debt_shares_user_paid_idx on public.debt_shares (user_id, paid_at);
