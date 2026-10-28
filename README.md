# ✨ Relicário — Inventário digital para mesas de RPG

Um aplicativo de navegador para organizar **itens, tesouros e moedas**, separado por **mesas/campanhas** e por **bolsas** (inventários de personagens ou baús do grupo).

**Tecnologias:** React + Vite (site estático), Supabase (login, banco PostgreSQL e segurança por mesa) e GitHub Pages (hospedagem do site).

## ⚡ Importante: HTML branco ao abrir com dois cliques?

O `index.html` na raiz **não é uma página HTML independente**. Ele é a entrada de um aplicativo React/Vite e não pode funcionar diretamente em `file://` porque os arquivos JSX precisam ser compilados.

**Para testar imediatamente:** dê dois cliques em **`ABRA-PARA-TESTAR.html`**. Essa é uma demonstração offline em um único arquivo, com mesas, bolsas, itens, categorias, moedas e backup JSON; não necessita Node.js e não sincroniza dados entre computadores.

**Para testar a aplicação React no Windows:** instale Node.js, extraia a pasta e dê dois cliques em **`INICIAR-APP-NO-WINDOWS.bat`**. Na primeira execução, o script instala dependências; depois, abra o endereço `http://localhost:5173` mostrado na janela de comando. A aplicação React funciona em modo demonstração sem Supabase configurado.

**Para jogar online com amigos:** publique o app React no GitHub Pages **via GitHub Actions** e configure o projeto Supabase, seguindo as etapas abaixo. Enviar apenas o `index.html` ao Pages ou abri-lo diretamente não funciona.

## O que funciona na versão 1.0

- Cadastro e login de jogadores com e-mail e senha.
- Mesas ilimitadas, cada uma com **código de convite**.
- Ao criar a mesa, cria automaticamente um **Baú do grupo**.
- Criação de bolsas de **personagem** ou **grupo**.
- Categorias: Armas, Armaduras, Equipamentos, Consumíveis, Magia, Componentes, Tesouros e Outros.
- Itens: nome, categoria, quantidade, valor estimado em peças de ouro e descrição.
- Pesquisa por nome/descrição e filtro por categoria.
- Cinco moedas de D&D: cobre (PC), prata (PP), electro (PE), ouro (PO) e platina (PL).
- Entrada e saída de moedas com proteção contra saldo negativo e histórico de 12 últimas movimentações.
- Todos os membros podem visualizar as bolsas da mesa. **Bolsas de grupo são editáveis por todos; bolsas de personagem, pelo dono ou mestre.**
- Layout responsivo para computador e celular.
- Atualização automática do inventário aberto a cada **15 segundos**, mais botão de recarregar.
- Sem banco configurado, funciona em **modo demonstração**, salvando os dados apenas no navegador.

> O GitHub Pages **não executa um banco de dados**. Ele publica os arquivos do aplicativo. O Supabase guarda os dados e controla as permissões. A chave **publicável** do Supabase pode ser usada no navegador **somente** com RLS ativo (já configurado no SQL).

## 1. Configurar o banco de dados

1. Acesse [supabase.com](https://supabase.com) e crie um projeto.
2. Abra **SQL Editor → New query**.
3. Copie todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql) e execute-o uma vez em **Run** (projeto novo recomendado).
4. Em **Authentication → Providers → Email**, mantenha o provedor de e-mail habilitado. Recomenda-se **Confirm email** ligado.
5. Em **Project Settings → API Keys** (ou **Connect**), copie:
   - **Project URL**, que começa com `https://...supabase.co`;
   - **Publishable key**, começando com `sb_publishable_...`.
6. **Não utilize Secret Key (`sb_secret_...`) nem `service_role` no React, no GitHub ou em arquivos públicos.**

**Importante:** Para testes com vários amigos, o serviço de e-mail de cadastro do Supabase pode ter limites. Se necessário, configure SMTP próprio no painel do Supabase. Nunca desative as políticas RLS.

## 2. Rodar no computador

Você precisa de Node.js 20.19+ ou 22.12+ e npm.

```bash
npm install
cp .env.example .env
```

No Windows, você também pode copiar manualmente `.env.example` para `.env`. Depois, preencha o `.env`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
```

Inicie:

```bash
npm run dev
```

Abra o endereço exibido (normalmente `http://localhost:5173`).

**Sem `.env` ou com os valores de exemplo**, o app inicia em **demonstração local**: serve para conhecer o visual, mas **não sincroniza** com os amigos.

## 3. Publicar no GitHub Pages (passo a passo)

1. Crie um repositório no GitHub chamado, por exemplo, `relicario-rpg`.
2. Envie **o conteúdo inteiro desta pasta**, inclusive o diretório oculto `.github/workflows/deploy.yml`. Não envie o arquivo `.env`. Para preservar pastas e arquivos ocultos, prefira GitHub Desktop ou Git pelo terminal; **não** envie apenas o ZIP, e não crie uma pasta extra `rpg-bag-digital/` na raiz do repositório.
3. Confirme que a branch principal se chama **`main`**.
4. No GitHub, abra **Settings → Secrets and variables → Actions → Variables → New repository variable** e crie estas **duas variáveis**:

   | Nome da variável | Valor |
   | --- | --- |
   | `VITE_SUPABASE_URL` | URL do seu projeto Supabase |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave publicável `sb_publishable_...` |

5. Abra **Settings → Pages → Build and deployment → Source** e selecione **GitHub Actions**.
6. Abra **Actions** e acompanhe o workflow de publicação. Se não disparar, use **Run workflow**.
7. O site ficará em uma URL como:

   `https://SEU-USUARIO.github.io/relicario-rpg/`

O arquivo `vite.config.js` identifica o nome do repositório automaticamente durante a publicação. **Não é necessário editar o `base` manualmente.**

### 3.1. Configurar o login para o endereço definitivo

No Supabase, abra **Authentication → URL Configuration** e configure:

- **Site URL:** `https://SEU-USUARIO.github.io/relicario-rpg/`
- **Redirect URLs:** inclua `https://SEU-USUARIO.github.io/relicario-rpg/**`
- Para testar localmente com confirmação de e-mail, inclua `http://localhost:5173/**` também.

Sem a configuração dessas URLs, o link de confirmação por e-mail pode levar para o endereço errado.

### 3.2. Se preferir enviar pelo terminal

Na pasta do projeto, substitua `SEU-USUARIO` e o nome do repositório:

```bash
git init
git add .
git commit -m "Primeira versão do Relicário"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/relicario-rpg.git
git push -u origin main
```

## 4. Como usar com os amigos

1. Você entra no site, cria sua conta e confirma o e-mail.
2. Clica em **Nova mesa**, informa nome e sistema, e recebe o código de convite.
3. Envia o código aos amigos (e a URL do site).
4. Cada amigo se cadastra e usa **Entrar com código**.
5. Todos veem o **Baú do grupo** e criam sua **bolsa individual**.
6. Os integrantes podem editar o baú em conjunto e consultar os itens dos demais personagens; somente o dono da bolsa individual e o mestre podem modificá-la.

## 5. Organização do projeto

```text
rpg-bag-digital/
├── .github/workflows/deploy.yml  # publicação automática no Pages
├── supabase/schema.sql           # tabelas, convites, RLS e funções SQL
├── src/App.jsx                   # telas, formulários e interações
├── src/lib/data.js               # acesso ao Supabase e modo demo
├── src/styles.css                # identidade visual e responsividade
├── src/main.jsx
├── index.html
├── vite.config.js
├── .env.example
├── .gitignore
└── package.json
```

## Limites desta primeira versão

- Não há transferência direta de itens ou moedas entre bolsas (você pode retirar de uma e adicionar na outra manualmente).
- Ainda não tem upload de imagem, peso dos itens ou regras específicas de um sistema.
- A atualização entre jogadores é por consulta periódica, **não por Realtime**; alterações aparecem em até cerca de 15 segundos no inventário aberto, ou ao tocar em atualizar (o atraso real depende da rede).
- O histórico cobre movimentação de **moedas**, não edições de itens.
- Códigos de convite dão acesso às mesas. Compartilhe apenas com os jogadores desejados. Se um código vazar, **a primeira versão não oferece rotação do código na interface**.
- O mestre pode excluir sua própria mesa; a exclusão apaga permanentemente bolsas e itens dessa mesa.
- O modo demonstração fica somente no armazenamento local do navegador, não é um substituto pelo Supabase.

## Segurança

O SQL ativa RLS nas seis tabelas. Os usuários autenticados só conseguem acessar dados de mesas das quais participam. A carteira é modificada apenas pela função transacional `adjust_coins`, que verifica autorização e saldo. A função `join_mesa` valida códigos de convite no servidor. Os privilégios de escrita diretos nas tabelas de moedas foram removidos.

O repositório pode ser público: ele contém apenas frontend e esquema SQL. **Nunca inclua a senha do banco, JWTs, chaves secretas ou seu `.env` no Git.**

## Próximas evoluções possíveis

Transferências entre personagens, registro de atividades por jogador, retratos e miniaturas, itens mágicos com cargas, vínculo entre personagem e classe, pontos de carga/peso, modo offline, suporte a múltiplas carteiras e sistema de permissões mais sofisticado (mestre, jogadores e observadores).
