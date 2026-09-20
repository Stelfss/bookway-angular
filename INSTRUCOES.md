# Lote 3 (atualizado): rodapé definitivo + página Singin (cadastro)

## 1) Substituir: `src/styles.css` (arquivo inteiro dessa vez)

Da última vez pedi pra você só colar um trecho no final do arquivo — isso é
fácil de esquecer ou colar no lugar errado. Dessa vez troque o `styles.css`
inteiro pelo `styles.css` deste zip: ele já é o `base.css` + `index.css` +
a correção do rodapé, tudo junto, sem passo manual de "adicionar ao final".

## 2) Pasta nova: `pages/singin`

Copie a pasta `src/app/pages/singin` (com `.ts`, `.html`, `.css`) pra
dentro de `src/app/pages/` no seu projeto. É a página de cadastro (era o
`singin.html` + `singin.js` original) — já com as mesmas validações
(usuário com 3+ caracteres, senha com 6+ caracteres, confirmação de senha,
checagem de username duplicado via `rpc('check_username_exists')`, e
cadastro real via `supabase.auth.signUp`).

## 3) Substituir: `src/app/app.routes.ts`

Troque pelo deste arquivo — só adicionei a rota `singin` dentro do mesmo
grupo do `PublicLayoutComponent` (junto com intro e login).

## Depois de aplicar

1. Acesse `localhost:4200/singin` — deve aparecer com cabeçalho, logo,
   formulário completo (usuário/email/senha/repetir senha) e rodapé, tudo
   estilizado igual ao login
2. O rodapé deve estar correto agora em TODAS as páginas públicas
   (intro, login, singin)
3. Teste criar uma conta de verdade, se quiser — ele deve validar os
   campos e criar o usuário no Supabase

## Sobre a página Home com o "hero slide"

Essa eu vou te mandar no próximo lote — o `home.html` é bem mais extenso
que login/singin (tem carrossel de destaques, seções de estante, etc.) e
prefiro examinar o código completo dele com calma antes de converter, pra
não repetir os erros de pressa que já tivemos. Só confirma esse lote 3
primeiro.
