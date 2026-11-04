# Dívidas: controle de dívidas

@AGENTS.md

## REGRA PERMANENTE

**Antes de qualquer tarefa, ler este arquivo. Depois de qualquer tarefa, atualizá-lo.**
Toda alteração no projeto deve ser registrada na seção [Histórico de alterações](#histórico-de-alterações), com data, o que mudou e por quê.

## Visão geral

App web mobile-first, instalável como PWA, para controlar as dívidas que o usuário tem e as que têm com ele. Cada usuário tem sua conta e vê apenas os próprios dados.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 + shadcn/ui (radix)
- Supabase: Auth, Postgres e Row Level Security
- Hospedagem na Vercel
- Zod e React Hook Form nos formulários; Vitest e PGlite nos testes

## Decisões de arquitetura

- **Dinheiro em centavos:** sempre inteiro (`bigint` no banco, `number` no código). Nunca usar float para valores.
- **Segurança no banco:** o RLS garante o isolamento. As FKs compostas `(person_id, user_id)` e `(debt_id, user_id)` existem porque a checagem de FK ignora o RLS; sem elas, daria para apontar para a pessoa de outro usuário.
- **Escrita atômica:** dívida e partes são gravadas juntas pelas funções `create_debt` e `update_debt`, que rodam como o usuário (`security invoker`).
- **Divisão em um só lugar:** `src/lib/split.ts` calcula, inclusive para a prévia do formulário. O banco só confere se a soma bate.
- **Next 16:** `src/proxy.ts` é o antigo middleware. Cache Components está ligado, então leituras de dados por usuário ficam dentro de `<Suspense>`. Não usar `use cache` em dados de usuário.
- **Links de e-mail:** usam `token_hash` em `/auth/confirm` (e não PKCE) para funcionar se o link abrir em outro navegador ou no celular. Depende dos templates em `supabase/templates/`.
- **PWA sem service worker:** o app é instalável, mas não funciona offline, por decisão de produto (evita saldos desatualizados e conflitos de sincronização).

## Estrutura de pastas

```text
supabase/
  migrations/          schema, RLS, funções e views
  templates/           e-mails de confirmação e de redefinição de senha
  tests/db.test.ts     testes das migrations reais no PGlite (sem Docker)
src/
  proxy.ts             renova a sessão e protege as rotas
  app/
    (auth)/            login, cadastro, esqueci-senha, redefinir-senha, actions
    (app)/             rotas autenticadas
    auth/confirm/      destino dos links de e-mail
    manifest.ts        manifesto do PWA
  components/          ui/ (shadcn), auth/, layout/
  lib/                 regras puras: money, split, safe-redirect, validations/
  services/supabase/   cliente do servidor e consultas
  types/database.ts    tipos do banco
```

## Modelo do banco

- **`people`:** `id`, `user_id`, `name` (único por usuário, sem diferenciar maiúsculas), `created_at`.
- **`debts`:** `id`, `user_id`, `direction` (`i_owe` | `owed_to_me`), `total_cents`, `self_share_cents`, `description`, `occurred_on`, `created_at`, `updated_at`.
- **`debt_shares`:** `id`, `user_id`, `debt_id`, `person_id`, `amount_cents`, `position`, `paid_at`.
- **View `person_balances`:** a receber, a pagar e líquido por pessoa, só com partes pendentes.
- **View `debt_share_details`:** uma linha por parte, com dados da dívida e da pessoa.

## Regras de negócio

- **Divisão:** o valor é dividido igualmente entre as pessoas selecionadas. Os centavos que sobram vão para as primeiras: R$ 100 / 3 = 33,34 / 33,33 / 33,33.
- **Me incluir:** desligado, as pessoas pagam o valor total. Ligado, o usuário entra como mais uma parte, sempre a última, e essa parte (`self_share_cents`) não vira dívida. Sempre vale `total_cents = self_share_cents + soma das partes`.
- **Valor mínimo:** cada parte precisa de ao menos R$ 0,01, então o total não pode ser menor que o número de partes.
- **Status:** é por pessoa. `paid_at` vazio = pendente; preenchido = paga. Uma parte paga sai do saldo, mas continua no histórico.
- **Saldo:** por pessoa, é o líquido das partes pendentes (o que ela me deve menos o que eu devo a ela). Os totais do topo somam esses líquidos: positivos em "me devem", negativos em "eu devo".
- **Composição do saldo:** lista as partes pendentes, primeiro o que a pessoa me deve e depois o que eu devo, cada grupo por data: "30 Restaurante + 50 Festa + 20 Bebida − 30 Uber = 70 (valor que me deve)".
- **Edição:** a parte continua paga somente se a pessoa continua na dívida, o valor dela não mudou e o sentido da dívida não mudou. Caso contrário, volta a pendente.

## Como rodar localmente

Requer Node 22 e Docker Desktop em execução.

```bash
npm install
npx supabase start            # sobe Postgres, Auth e Mailpit e aplica as migrations
cp .env.example .env.local    # preencha com os valores de `npx supabase status`
npm run dev                   # http://localhost:3000
```

E-mails locais de confirmação e de senha aparecem no Mailpit: http://127.0.0.1:54324.

```bash
npm test                # testes unitários e de banco (não precisam de Docker)
npm run typecheck
npm run lint
npm run db:types        # regenera src/types/database.ts (precisa do Supabase local)
```

Mudou o banco? Crie uma nova migration em `supabase/migrations/`, nunca edite uma já aplicada em produção.

## Deploy

### Supabase

1. Crie o projeto em supabase.com.
2. Rode `npx supabase login`, `npx supabase link --project-ref <ref>` e `npx supabase db push`.
3. Em **Authentication > URL Configuration**, defina a Site URL com a URL da Vercel e adicione `<url>/auth/confirm` às Redirect URLs.
4. Em **Authentication > Email Templates**, copie o conteúdo de `supabase/templates/confirmation.html` e `recovery.html`. Sem isso, os links de e-mail não apontam para `/auth/confirm`.
5. Configure um SMTP próprio em **Authentication > SMTP Settings**. O serviço padrão do Supabase envia pouquíssimos e-mails por hora.

### Vercel

1. Importe o repositório e defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Faça o deploy e atualize a Site URL do Supabase, caso a URL final seja outra.

## Histórico de alterações

### 2026-11-04: Etapa 3, listagem e saldos

- **O que mudou:** tela principal com resumo e saldo por pessoa; página da pessoa com histórico e composição do saldo ("30 Restaurante + 50 Festa + 20 Bebida − 30 Uber = 70 (valor que me deve)").
- **Por quê:** o usuário pediu para ver de onde vem o valor de cada saldo. Os totais do topo somam os saldos líquidos para bater com a lista.

### 2026-11-04: Etapa 2, cadastro de dívidas

- **O que mudou:** formulário de nova dívida com valor, tipo, seleção e criação de pessoas, "me incluir", origem e data; prévia da divisão; Server Actions e consultas.
- **Por quê:** é o fluxo central do app. Pessoas novas só são gravadas ao salvar, para não deixar cadastros soltos se o usuário desistir. O campo de valor funciona como caixa eletrônico (só dígitos), o que elimina a ambiguidade entre vírgula e ponto. A data padrão usa o fuso do Brasil, porque o servidor roda em UTC.

### 2026-11-04: Etapa 1, banco e autenticação

- **O que mudou:** projeto Next.js criado; migrations de tabelas, RLS, funções e views; login, cadastro, recuperação de senha e rotas protegidas; manifesto e ícones do PWA; testes de banco no PGlite; este arquivo.
- **Por quê:** é a base do app. A recuperação de senha foi incluída a pedido do usuário. `self_share_cents` foi adicionado ao plano original para o botão "me incluir". O status ficou por pessoa, porque cada um pode pagar em um momento diferente. Os testes usam PGlite para verificar o isolamento entre usuários sem depender do Docker.
