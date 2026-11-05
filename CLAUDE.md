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
- **Escrita atômica:** dívida e partes são gravadas juntas pelas funções `create_debt` e `update_debt`, e `delete_person` exclui a pessoa e o histórico dela de uma vez. Todas rodam como o usuário (`security invoker`).
- **Divisão em um só lugar:** `src/lib/split.ts` calcula, inclusive para a prévia do formulário. O banco confere se cada parte tem o valor esperado.
- **Next 16:** `src/proxy.ts` é o antigo middleware. Cache Components está ligado, então leituras de dados por usuário ficam dentro de `<Suspense>`, e `createClient` chama `await connection()`. Não usar `use cache` em dados de usuário.
- **Páginas ficam vivas ao navegar:** o Next as esconde com `<Activity>` em vez de destruí-las, preservando o estado. Para uma tela voltar zerada, é preciso limpar o estado na saída, e valores iniciais vindos do servidor não atualizam um formulário já montado. `DebtForm` trata os dois casos.
- **Links de confirmação de cadastro:** `/auth/confirm` aceita dois formatos. `code` vem dos templates padrão do Supabase e só cria a sessão no navegador que pediu o e-mail. `token_hash` vem dos templates em `supabase/templates/` e funciona em qualquer navegador, mas o painel só permite editar templates com SMTP próprio. Hoje a produção usa `code`.
- **Links de redefinição de senha:** usam o fluxo implícito (`createPasswordRecoveryClient`), porque o PKCE do cliente com cookies só funciona no navegador que fez o pedido. O link volta para `/auth/recuperar` com os tokens depois do `#`; só o navegador os vê, e a página os envia a `startRecoverySession` e os apaga da URL. `RecoveryHashRedirect`, no layout raiz, encaminha para lá os links que caem em outra página, como os enviados pelo painel do Supabase.
- **`/auth/*` fora da sessão do proxy:** o proxy não chama `getUser` nessas rotas. Se a renovação de uma sessão antiga falha, o Supabase apaga também os cookies do PKCE, e o link deixaria de funcionar.
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
    (auth)/            login, cadastro, esqueci-senha, redefinir-senha, auth/recuperar, actions
    (app)/             rotas autenticadas
    auth/confirm/      destino dos links de confirmação de cadastro
    manifest.ts        manifesto do PWA
  components/          ui/ (shadcn), auth/, balances/, debts/, layout/, people/
  lib/                 regras puras: money, split, safe-redirect, recovery-link, validations/
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

- **Divisão:** o valor é dividido igualmente. Quando não dá exato, arredonda para cima, e todos pagam o mesmo: R$ 100 / 3 = 33,34 para cada um. Por isso, a soma das partes pode passar do total em alguns centavos, e `total_cents` guarda o valor digitado.
- **Me incluir:** só existe em "Me devem". Desligado, as pessoas pagam o valor total. Ligado, o usuário conta como mais uma parte, e essa parte (`self_share_cents`) não vira dívida.
- **Valor mínimo:** cada parte precisa de ao menos R$ 0,01, então o total não pode ser menor que o número de partes.
- **Status:** é por pessoa. `paid_at` vazio = pendente; preenchido = paga. Uma parte paga sai do saldo, mas continua no histórico.
- **Saldo:** por pessoa, é o líquido das partes pendentes (o que ela me deve menos o que eu devo a ela). Os totais do topo somam esses líquidos: positivos em "me devem", negativos em "eu devo".
- **Composição do saldo:** mostra só os valores das partes pendentes, primeiro o que a pessoa me deve e depois o que eu devo, cada grupo por data. Na tela principal: "30 + 50 + 20 − 30". Na página da pessoa, com o resultado: "30 + 50 + 20 − 30 = 70", e só quando há mais de uma parte pendente. Se o usuário é quem deve, o resultado leva o sinal: "10 − 30 = − 20". As origens ficam no histórico.
- **Marcar como paga:** pode ser uma parte, todas as partes de uma dívida (página da dívida) ou tudo o que está pendente com uma pessoa (página da pessoa, nos dois sentidos, com confirmação). Partes já pagas mantêm a data original do pagamento.
- **Edição:** a parte continua paga somente se a pessoa continua na dívida, o valor dela não mudou e o sentido da dívida não mudou. Caso contrário, volta a pendente.
- **Criar pessoa:** pelo botão "Nova pessoa" em Saldos ou ao cadastrar uma dívida. O nome é único por usuário.
- **Excluir pessoa:** na página da pessoa, com confirmação, e só sem nenhuma parte pendente (mesmo com saldo líquido zero). O histórico dela é apagado. Dívida só dela é removida. Dívida dividida continua para as outras pessoas com os mesmos valores, e o total passa a ser a soma do que restou.

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

1. Para novas migrations, rode `npx supabase login`, `npx supabase link --project-ref lxkylwyyjumfmyxjpvlu` e `npx supabase db push --remote`. Sem `--remote`, `db push` e `migration list` usam o Supabase local. As quatro primeiras foram aplicadas pelo SQL Editor e registradas em `supabase_migrations.schema_migrations`. As sete migrations atuais estão aplicadas em produção (conferido em 2026-11-04).
2. Em **Authentication > URL Configuration**, a Site URL é a da Vercel, e as Redirect URLs têm `/auth/confirm` e `/auth/recuperar`, locais e de produção. Se a URL da Vercel mudar, atualize os dois campos. As Redirect URLs sem curinga comparam a URL inteira, inclusive a query string, e uma URL fora da lista cai na Site URL.
3. Para outras pessoas usarem o app, configure um SMTP próprio em **Authentication > Emails > SMTP Settings**. O serviço padrão envia só 2 e-mails por hora no projeto inteiro, somando todos os usuários, e é destinado a testes. O campo fica bloqueado sem SMTP próprio.
4. Com SMTP configurado, copie `supabase/templates/confirmation.html` para **Authentication > Emails > Templates**, para que a confirmação de cadastro funcione em qualquer navegador. O `recovery.html` é opcional: a redefinição de senha já funciona assim.

### Vercel

Projeto atual: **dividas**, na conta `henriquestroher`, ligado ao repositório do GitHub. URL de produção: https://dividas-kappa.vercel.app. `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` já estão cadastradas em produção, preview e desenvolvimento.

1. Cada push na `main` gera um deploy de produção. Para fazer um manualmente: `npx vercel deploy --prod`.
2. No PowerShell, a lista de ambientes de `vercel env add` precisa de aspas: `--environment 'production,preview,development'`. Sem elas, o comando falha com `invalid_environment`.
3. `vercel link` acrescenta `.vercel` e `.env*` ao `.gitignore`. Desfaça essa mudança: os dois já estão ignorados, e `.env*` ignoraria também um novo `.env.example`.

## Histórico de alterações

### 2026-11-05: redefinição de senha em qualquer navegador

- **Link:** o e-mail agora usa o fluxo implícito e volta para a nova página `/auth/recuperar`, que abre a sessão e leva à nova senha. Antes, em PKCE, o link falhava sem nenhum `/token?grant_type=pkce` nos logs quando faltava o cookie do PKCE: ao abrir em outro navegador ou quando o proxy o apagava ao renovar uma sessão antiga. O erro também sumia para quem já estava logado, porque o proxy mandava de `/login?erro=...` para `/`.
- **Link enviado pelo painel do Supabase:** volta para a Site URL com os tokens depois do `#`, e o login os ignorava. `RecoveryHashRedirect` passou a encaminhá-lo. Link usado ou vencido mostra o motivo e o botão "Pedir um novo link".
- **Mensagens:** ao enviar, o formulário dá lugar a um aviso em destaque, porque o texto cinza passava despercebido e um segundo toque gastaria outro e-mail. Agora qualquer erro do Supabase aparece, não só o de limite, e o texto do limite diz para aguardar até 1 hora.
- **Proxy:** não renova a sessão em `/auth/*`, e `/esqueci-senha` também abre para quem está logado.
- **Supabase:** `/auth/recuperar` entrou nas Redirect URLs, local e de produção.
- **Verificado:** testes, typecheck, lint e build. No app local com o Supabase real: pedido, e-mail, link até a tela de nova senha e link repetido. Não testados: salvar a nova senha (para não trocar a senha real) e abrir o link em outro navegador.
- **Pendente:** deploy e teste em produção. O limite de 2 e-mails por hora continua até configurar SMTP próprio.

### 2026-11-04: criar e excluir pessoas, e aba atual destacada

- **Pessoas:** Saldos ganhou o botão "Nova pessoa", e a página da pessoa ganhou "Excluir pessoa". A migration `20261104210000` cria `delete_person`, porque a FK `on delete restrict` impedia excluir quem tinha histórico, mesmo já pago. Exigir nada pendente evita apagar dinheiro em aberto por engano.
- **Barra inferior:** a aba atual ganha fundo escuro no ícone e texto em destaque. Saldos também fica marcada na página da pessoa. A página de uma dívida não marca nenhuma aba, porque pode ser aberta pelas duas. `usePathname` fica em `<Suspense>`, exigido pelo Cache Components nas rotas dinâmicas.
- **Verificado:** testes, typecheck, lint e build. A migration está aplicada em produção.
- **Pendente:** testar as telas no navegador com login.

### 2026-11-04: projeto criado na Vercel

- **O que mudou:** projeto `dividas` criado na Vercel e ligado ao GitHub; as duas variáveis do Supabase foram cadastradas nos três ambientes.
- **Por quê:** a tentativa anterior travou antes de criar o projeto. As variáveis falharam na primeira vez porque o PowerShell separa a lista de ambientes sem aspas.
- **Deploy:** o usuário fez o primeiro deploy de produção pelo terminal; o app está em https://dividas-kappa.vercel.app.
- **Supabase:** a Site URL passou a ser a de produção, e `<url>/auth/confirm` entrou nas Redirect URLs, ao lado da URL local.
- **Pendente:** testar cadastro e login em produção.

### 2026-11-04: arredondamento para cima e textos

- **Arredondamento:** quando a divisão não dá exata, todos pagam o valor arredondado para cima (R$ 100 / 3 = 33,34), mesmo que a soma passe do total. A migration `20261104200000` atualiza a checagem no banco. É decisão do usuário e substitui a regra anterior, do centavo mais próximo. Dívidas antigas só mudam se forem editadas.
- **Textos:** abaixo do saldo da pessoa aparece "Valor total"; a conta perdeu o texto entre parênteses e, sem ele, o resultado leva o sinal quando o usuário é quem deve; os rótulos viraram "Me deve" e "Eu devo".
- **Bug corrigido:** depois de salvar uma edição, reabrir a edição mostrava o valor anterior, e salvar de novo sobrescreveria o valor certo. Agora `DebtForm` recomeça quando os dados do servidor mudam.
- **Verificado:** o usuário testou a redefinição de senha; no navegador, foram testados a busca com filtros e salvar uma edição.

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
- **Pendente:** regenerar `src/types/database.ts` (requer `npx supabase login`) e fazer o deploy (etapa 5). O Docker Desktop não concluiu a configuração nesta máquina, então os testes de banco usam PGlite e o desenvolvimento local aponta para o projeto real.

### 2026-11-04: Etapa 3, listagem e saldos

- **O que mudou:** tela principal com resumo e saldo por pessoa; página da pessoa com histórico e composição do saldo ("30 Restaurante + 50 Festa + 20 Bebida − 30 Uber = 70 (valor que me deve)").
- **Por quê:** o usuário pediu para ver de onde vem o valor de cada saldo. Os totais do topo somam os saldos líquidos para bater com a lista.

### 2026-11-04: Etapa 2, cadastro de dívidas

- **O que mudou:** formulário de nova dívida com valor, tipo, seleção e criação de pessoas, "me incluir", origem e data; prévia da divisão; Server Actions e consultas.
- **Por quê:** é o fluxo central do app. Pessoas novas só são gravadas ao salvar, para não deixar cadastros soltos se o usuário desistir. O campo de valor funciona como caixa eletrônico (só dígitos), o que elimina a ambiguidade entre vírgula e ponto. A data padrão usa o fuso do Brasil, porque o servidor roda em UTC.

### 2026-11-04: Etapa 1, banco e autenticação

- **O que mudou:** projeto Next.js criado; migrations de tabelas, RLS, funções e views; login, cadastro, recuperação de senha e rotas protegidas; manifesto e ícones do PWA; testes de banco no PGlite; este arquivo.
- **Por quê:** é a base do app. A recuperação de senha foi incluída a pedido do usuário. `self_share_cents` foi adicionado ao plano original para o botão "me incluir". O status ficou por pessoa, porque cada um pode pagar em um momento diferente. Os testes usam PGlite para verificar o isolamento entre usuários sem depender do Docker.
