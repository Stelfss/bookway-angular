# Como aplicar isso no seu projeto bookway-angular

Este zip tem 4 arquivos. Cada um vai num lugar diferente do seu projeto real
(o que está aberto no VS Code). Copie um por um.

## 1) Arquivo novo: pasta `layout/main-layout`

Copie a pasta inteira `src/app/layout` (com `main-layout.ts`, `main-layout.html`
e `main-layout.css` dentro) para dentro de `src/app/` no seu projeto.
Fica assim: `src/app/layout/main-layout/main-layout.ts` etc.

Esse componente é a "moldura" com a barra lateral (menu) e o cabeçalho de
cima, baseados no `home.html` original. As rotas internas (home, bookshelf,
chat...) vão aparecer dentro dele, no lugar do `<router-outlet>`.

## 2) Substituir: `src/app/app.routes.ts`

Abra o `app.routes.ts` do seu projeto e troque o conteúdo inteiro pelo deste
arquivo. Ele:
- Mantém a rota `/login` separada (sem sidebar/header, como deve ser)
- Coloca `/home` DENTRO do `MainLayoutComponent`, então quando você acessar
  `/home` agora vai aparecer com a barra lateral e o cabeçalho
- Já deixa um comentário mostrando onde adicionar as próximas páginas
  conforme forem convertidas

## 3) Substituir: `src/styles.css`

Esse é o arquivo de estilos GLOBAL do projeto (fora de qualquer componente).
Troque o conteúdo pelo deste arquivo — é o seu `base.css` original completo,
só com os caminhos de imagem corrigidos (de `../imagens/...` para
`/imagens/...`, que é como o Angular serve a pasta `public/`).

Isso é o que dá estilo pra sidebar, ao cabeçalho, aos botões etc. Sem isso,
o layout vai aparecer sem formatação nenhuma.

## Depois de aplicar os 3 pontos

1. Salve tudo
2. Se o `ng serve` estiver rodando, ele deve recarregar sozinho
3. Acesse `localhost:4200/home` — agora deve aparecer com a barra lateral e o
   cabeçalho de verdade, do jeito que era no site original

## Coisas que ainda ficaram como "TODO" (de propósito, pra próxima etapa)

- O botão "Criar Comunidade" e a barra de pesquisa do cabeçalho não fazem
  nada ainda (só estão visuais) — a lógica completa deles depende de outras
  páginas/modais que ainda não foram convertidas
- O número de "streak" (sequência) está fixo em 0 — no original ele vem do
  banco de dados; isso pode ser conectado depois, buscando do Supabase no
  `main-layout.ts`
- Cada nova página (bookshelf, chat, etc.) que você converter deve entrar
  como "filha" dentro do array `children` do `app.routes.ts`, do jeito que
  a `home` está agora — assim ela automaticamente ganha a sidebar/header sem
  precisar copiar esse código de novo
