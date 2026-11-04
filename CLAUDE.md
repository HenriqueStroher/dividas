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
- **Divisão em um só lugar:** `src/lib/split.ts` calcula, inclusive para a prévia do formulário. O banco confere se cada parte tem o valor esperado.
- **Next 16:** `src/proxy.ts` é o antigo middleware. Cache Components está ligado, então leituras de dados por usuário ficam dentro de `<Suspense>`, e `createClient` chama `await connection()`. Não usar `use cache` em dados de usuário.
- **Páginas ficam vivas ao navegar:** o Next as esconde com `<Activity>` em vez de destruí-las, preservando o estado. Para uma tela voltar zerada, é preciso limpar o estado na saída, como faz `DebtForm`.
- **Links de e-mail:** `/auth/confirm` aceita dois formatos. `code` vem dos templates padrão do Supabase e só cria a sessão no navegador que pediu o e-mail. `token_hash` vem dos templates em `supabase/templates/` e funciona em qualquer navegador, mas o painel só permite editar templates com SMTP próprio. Hoje a produção usa `code`.
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

- **Divisão:** o valor é dividido igualmente e arredondado para o centavo mais próximo. Todos pagam o mesmo, sem centavo a mais para ninguém: R$ 100 / 3 = 33,33 para cada um; R$ 200 / 3 = 66,67. Por isso, a soma das partes pode diferir do total em alguns centavos, e `total_cents` guarda o valor digitado.
- **Me incluir:** só existe em "Me devem". Desligado, as pessoas pagam o valor total. Ligado, o usuário conta como mais uma parte, e essa parte (`self_share_cents`) não vira dívida.
- **Valor mínimo:** cada parte precisa de ao menos R$ 0,01, então o total não pode ser menor que o número de partes.
- **Status:** é por pessoa. `paid_at` vazio = pendente; preenchido = paga. Uma parte paga sai do saldo, mas continua no histórico.
- **Saldo:** por pessoa, é o líquido das partes pendentes (o que ela me deve menos o que eu devo a ela). Os totais do topo somam esses líquidos: positivos em "me devem", negativos em "eu devo".
- **Composição do saldo:** mostra só os valores das partes pendentes, primeiro o que a pessoa me deve e depois o que eu devo, cada grupo por data. Na tela principal: "30 + 50 + 20 − 30". Na página da pessoa, com o resultado: "30 + 50 + 20 − 30 = 70 (valor que me deve)", e só quando há mais de uma parte pendente. As origens ficam no histórico.
- **Marcar como paga:** pode ser uma parte, todas as partes de uma dívida (página da dívida) ou tudo o que está pendente com uma pessoa (página da pessoa, nos dois sentidos, com confirmação). Partes já pagas mantêm a data original do pagamento.
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

Projeto atual: **Dividas**, ref `lxkylwyyjumfmyxjpvlu`. Migrations, Redirect URL local e senha mínima de 8 caracteres já estão aplicados.

1. Para novas migrations, rode `npx supabase login`, `npx supabase link --project-ref lxkylwyyjumfmyxjpvlu` e `npx supabase db push`. As quatro primeiras foram aplicadas pelo SQL Editor e registradas em `supabase_migrations.schema_migrations`.
2. Depois do deploy, em **Authentication > URL Configuration**, troque a Site URL pela URL da Vercel e adicione `<url>/auth/confirm` às Redirect URLs.
3. Para outras pessoas usarem o app, configure um SMTP próprio em **Authentication > Emails > SMTP Settings**. O serviço padrão tem limite muito baixo de envio e é destinado a testes.
4. Com SMTP configurado, copie `supabase/templates/confirmation.html` e `recovery.html` para **Authentication > Emails > Templates**, para que os links funcionem em qualquer navegador.

### Vercel

1. Importe o repositório e defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Faça o deploy e atualize a Site URL do Supabase, caso a URL final seja outra.

## Histórico de alterações

### 2026-11-04: quitar tudo com uma pessoa

- **O que mudou:** a página da pessoa mostra a conta só com os valores ("5 + 14 = 19 (valor que me deve)") e ganhou o botão "Marcar todas como pagas", com confirmação.
- **Por quê:** pedido do usuário. As origens já aparecem no histórico logo abaixo, e quitar item por item era trabalhoso. A confirmação evita quitar tudo por um toque acidental.
- **Também:** os botões de pagamento mostram "Salvando..." ou "Marcando..." durante a espera, porque nos testes uma resposta levou 8 segundos sem nenhum sinal na tela. A conta fica oculta quando há só uma parte pendente, para não mostrar "10 = 10".

### 2026-11-04: ajustes pedidos após o primeiro uso

- **Formulário zerado:** ao sair da página, o formulário volta ao estado inicial. O Next preservava os dados da última dívida.
- **Seleção de pessoas:** a lista só aparece ao tocar no campo "Buscar ou criar pessoa". Fora dele, aparecem só as selecionadas, que podem ser removidas com um toque.
- **Me incluir:** só aparece em "Me devem", porque não faz sentido em "Eu devo".
- **Tela principal:** mostra só os valores abaixo do nome; as origens ficam na página da pessoa.
- **Arredondamento:** a sobra de centavos deixou de ir para as primeiras pessoas. Agora todos pagam o mesmo valor arredondado, e a migration `20261104180000` atualiza a checagem no banco. Dívidas antigas só mudam se forem editadas.
- **Campo de valor:** o cursor agora fica sempre no fim (`CurrencyInput`). Um toque no meio do campo fazia R$ 100 virar R$ 100.000. Bug encontrado nos testes no navegador.
- **Erro de desenvolvimento:** `createClient` passou a chamar `await connection()`, o que elimina o aviso "unstable value `Date.now()`".

### 2026-11-04: projeto Supabase configurado e links de e-mail padrão

- **O que mudou:** migrations aplicadas no projeto Dividas; Redirect URL local e senha mínima de 8 caracteres configuradas; `/auth/confirm` passou a aceitar `code`, além de `token_hash`; cadastro e recuperação de senha agora informam a URL de retorno; `.env.local` criado.
- **Por quê:** o Supabase só permite editar templates de e-mail com SMTP próprio. Sem essa mudança, os links dos e-mails padrão não funcionariam. Limitação atual: redefinir a senha exige abrir o link no mesmo navegador em que foi pedido.
- **Verificado:** no projeto real, visitantes sem login recebem "permission denied" em tabelas, views e funções.

### 2026-11-04: shadcn em devDependencies

- **O que mudou:** o pacote `shadcn` passou de `dependencies` para `devDependencies`.
- **Por quê:** ele só fornece a CLI e um CSS usado no build. Com a mudança, `npm audit --omit=dev` não aponta vulnerabilidades; os avisos restantes são de ferramentas de desenvolvimento.

### 2026-11-04: Etapa 4, ações, busca e filtros

- **O que mudou:** página da dívida com todas as partes; editar, excluir e marcar como paga (por pessoa ou todas da dívida); busca por pessoa, origem e status.
- **Por quê:** completa as ações pedidas. Os filtros ficam na URL, para sobreviverem ao voltar da página de uma dívida. "Marcar todas" não altera partes já pagas, para preservar a data original do pagamento.
- **Pendente:** testar no navegador a redefinição de senha e a busca, salvar uma edição e regenerar `src/types/database.ts` (requer `npx supabase login`). Depois, fazer o deploy (etapa 5). O Docker Desktop não concluiu a configuração nesta máquina, então os testes de banco usam PGlite e o desenvolvimento local aponta para o projeto real.

### 2026-11-04: Etapa 3, listagem e saldos

- **O que mudou:** tela principal com resumo e saldo por pessoa; página da pessoa com histórico e composição do saldo ("30 Restaurante + 50 Festa + 20 Bebida − 30 Uber = 70 (valor que me deve)").
- **Por quê:** o usuário pediu para ver de onde vem o valor de cada saldo. Os totais do topo somam os saldos líquidos para bater com a lista.

### 2026-11-04: Etapa 2, cadastro de dívidas

- **O que mudou:** formulário de nova dívida com valor, tipo, seleção e criação de pessoas, "me incluir", origem e data; prévia da divisão; Server Actions e consultas.
- **Por quê:** é o fluxo central do app. Pessoas novas só são gravadas ao salvar, para não deixar cadastros soltos se o usuário desistir. O campo de valor funciona como caixa eletrônico (só dígitos), o que elimina a ambiguidade entre vírgula e ponto. A data padrão usa o fuso do Brasil, porque o servidor roda em UTC.

### 2026-11-04: Etapa 1, banco e autenticação

- **O que mudou:** projeto Next.js criado; migrations de tabelas, RLS, funções e views; login, cadastro, recuperação de senha e rotas protegidas; manifesto e ícones do PWA; testes de banco no PGlite; este arquivo.
- **Por quê:** é a base do app. A recuperação de senha foi incluída a pedido do usuário. `self_share_cents` foi adicionado ao plano original para o botão "me incluir". O status ficou por pessoa, porque cada um pode pagar em um momento diferente. Os testes usam PGlite para verificar o isolamento entre usuários sem depender do Docker.
