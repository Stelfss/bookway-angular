# Lote 3: conserto do login e do rodapé

## 1) Substituir: `src/app/pages/login/login.html`

Troque pelo deste arquivo — a diferença é que agora tudo está envolvido
numa tag `<main>`, que é o que faltava (o CSS `main { display: flex; ... }`
do index.css é o que posiciona a logo e o formulário lado a lado).

## 2) Substituir: `src/app/pages/login/login.css`

Troque pelo deste arquivo — ele vem **vazio de propósito**. Descobri que
o `login-signin.css` que colamos aí no início nunca foi usado pelo site
original de verdade (o `login.html` real só carrega o `index.css`). Então
esse conteúdo antigo estava causando estilos errados. Pode apagar tudo que
tem lá agora e deixar vazio.

## 3) Adicionar ao FINAL de `src/styles.css`

Não precisa trocar o arquivo inteiro dessa vez — só copie o conteúdo do
`footer-fix.css` (desse zip) e cole no final do seu `styles.css` atual.

Isso resolve uma colisão real que existe entre `base.css` e `index.css`:
os dois têm uma regra `footer { ... }` (a tag pura, não a classe
`.main-footer`) com propriedades diferentes. No site original isso nunca
dava problema porque cada página só carregava um dos dois arquivos — mas
agora que os dois estão juntos no mesmo `styles.css`, a regra do `base.css`
(pensada pro rodapé interno do app) estava vazando pro rodapé do site
público e bagunçando o layout.

## Depois de aplicar

1. Salve os 3 arquivos
2. Acesse `localhost:4200/login` — a logo pequena e o formulário devem
   aparecer lado a lado, do tamanho certo
3. Veja o rodapé (tanto na intro quanto no login) — o texto e os links
   devem aparecer espaçados corretamente, um de cada lado

Sobre a "intro": é só o nome que dei pro componente que veio do seu
`index.html` original (a página que abre antes do login, com o menu
Início/Recursos/Comunidades/Destaques). Não é algo novo que eu inventei —
é exatamente a página que você mesmo me descreveu. Se preferir outro nome
pra pasta/componente, é só me falar que eu ajusto nos próximos lotes.
