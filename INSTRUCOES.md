# Lote 2: Intro (página inicial) + conserto do Login

Este lote resolve o login quebrado E adiciona a página que vem antes do
login (era o `index.html` do projeto original).

## O que mudou de arquitetura

Descobrimos que seu site tem, na verdade, DOIS "moldes" de página:

1. **PublicLayoutComponent** (novo) — cabeçalho com "Início/Recursos/
   Comunidades/Destaques/Entrar/Criar" + rodapé. Usado nas páginas antes de
   logar: intro, login, e futuramente singin, about, etc.
2. **MainLayoutComponent** (já existia) — a barra lateral + cabeçalho do
   app. Usado nas páginas depois de logar: home, bookshelf, chat, etc.

## Passo a passo

### 1) Pasta nova: `layout/public-layout`

Copie a pasta `src/app/layout/public-layout` (com `.ts`, `.html`, `.css`)
pra dentro de `src/app/layout/` no seu projeto — ela fica do lado da
`main-layout` que já existe.

### 2) Pasta nova: `pages/intro`

Copie a pasta `src/app/pages/intro` pra dentro de `src/app/pages/` — essa é
a página inicial (era o `index.html`).

### 3) Substituir: `src/app/pages/login/login.html`

Troque o conteúdo pelo deste arquivo. Removi o cabeçalho e rodapé que
estavam duplicados sem estilo (causa do login quebrado) — agora eles vêm
do `PublicLayoutComponent` automaticamente.

### 4) Substituir: `src/app/pages/login/login.ts`

Troque pelo deste arquivo — só mudou o import do `RouterLink` (usado no
link "Cadastre-se").

**NÃO mexa no `login.css`** — ele continua igual, só com os estilos
específicos do formulário.

### 5) Substituir: `src/app/app.routes.ts`

Troque pelo deste arquivo. Agora tem os dois layouts organizados: um bloco
pra páginas públicas (intro, login) e outro pro app (home).

### 6) Substituir: `src/styles.css`

Troque pelo deste arquivo — é o `base.css` de antes + o `index.css`
somados (com os caminhos de imagem já corrigidos). Ele é grande (uns 3200
linhas) porque agora carrega o CSS de TODAS as páginas públicas e do app
de uma vez só — é assim mesmo, é intencional.

## Depois de aplicar tudo

1. Salve todos os arquivos
2. Acesse `localhost:4200/` (raiz, sem `/login`) — deve aparecer a página
   inicial (intro) com cabeçalho, seções e rodapé
3. Clique em "Entrar" no cabeçalho — deve ir pro login, agora com cabeçalho
   e rodapé estilizados corretamente
4. Teste o login de verdade — deve continuar funcionando e te levar pra
   `/home`

## Simplificação que fiz (de propósito)

No `index.js` original, o menu "Início/Recursos/..." destacava o link
ativo conforme você rolava a página (scroll-spy). Como o cabeçalho agora é
compartilhado entre várias páginas (não só a intro), essa animação de
destaque ficou simplificada por enquanto — o menu funciona pra navegar,
só não destaca mais sozinho qual seção está na tela. Dá pra recuperar isso
depois com um serviço compartilhado, se você quiser — é só avisar.
