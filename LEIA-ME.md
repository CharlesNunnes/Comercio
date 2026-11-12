# Point do RD — Site + App + Impressora

Este projeto tem quatro partes:

| Parte | Arquivo | O que faz |
| --- | --- | --- |
| Site / App (PWA) | `index.html`, `style.css`, `script.js`, `manifest.json`, `sw.js` | O cliente monta a pizza no celular e envia o pedido |
| Configurações do site | `config.js` | WhatsApp da loja, taxa de entrega |
| Firebase | `firebase.json`, `firestore.rules`, `firebase-config.js`, `firebase.js`, `admin.html` | Site no ar (HTTPS) + pedidos salvos + painel da loja |
| Servidor de impressão (opcional) | pasta `servidor/` | Envia o cupom para a impressora térmica (quando tiver) |

> **Situação atual: sem impressora.**
> O site está no modo **WhatsApp** (`impressaoAutomatica: false` em `config.js`): o cliente monta
> a pizza e o pedido abre pronto no WhatsApp da loja.
> Com o Firebase (item 3) os pedidos também ficam **salvos** e a loja acompanha tudo no painel
> `admin.html`, pelo celular. Quando a impressora chegar, ative a impressão no item 2.

---

## 1. Testar no computador (rápido)

1. Instale o **Node.js** (https://nodejs.org) — versão LTS (só é necessário para o servidor de impressão).
2. Dê **duplo clique** em `servidor/iniciar.bat`
   (ou abra o terminal e rode `node servidor/server.js`).
3. Abra no navegador: **http://localhost:3000**
4. Painel da loja: **http://localhost:3000/admin**
   Na primeira vez, clique em **Token** e cole o token que aparece no console
   (veja a seção 6.1).

Também dá para abrir o site direto pelo arquivo `index.html` (sem servidor). Nesse caso o pedido
também vai para o WhatsApp normalmente — só não é possível instalar como app (para isso precisa de
HTTPS, veja o item 3).

No modo de teste da impressora (`"tipo": "arquivo"`), o cupom **não sai na impressora**: ele é salvo
em `servidor/dados/cupons/pedido-0001.txt`.

---

## 2. Configurar a impressora (quando chegar)

> Depois de configurar a impressora aqui, abra `config.js` e mude
> `impressaoAutomatica: false` para `true`. Sem isso o site continua enviando pelo WhatsApp.

Abra `servidor/config.json` e escolha o tipo. Se o arquivo não existir, copie
`servidor/config.example.json` para `servidor/config.json` (o servidor também
cria esse arquivo sozinho na primeira execução, já com um token novo).

### A) Impressora térmica com rede ( cabo de rede / Wi-Fi ) — **recomendado**

```json
"impressora": {
  "tipo": "rede",
  "host": "192.168.0.200",
  "portaRede": 9100,
  "largura": 48,
  "copias": 1,
  "cortarPapel": true,
  "abrirGaveta": false
}
```

- `host`: o IP da impressora. Para descobrir, imprima o **teste de página** direto na impressora
  (normalmente segurando o botão FEED ao ligar). O IP aparece no papel.
- `portaRede`: quase sempre **9100**.
- `largura`: **48** para papel 80 mm, **32** para papel 58 mm.
- Deixe o IP fixo no roteador para não mudar.

Funciona com a maioria das térmicas ESC/POS: Epson, Elgin, Bematech, Daruma, Tanca, Knup, etc.

### B) Impressora USB instalada no Windows

```json
"impressora": {
  "tipo": "windows",
  "nomeWindows": "EPSON TM-T20III Receipt",
  "largura": 48,
  "copias": 1
}
```

- Instale o driver normal da impressora no Windows.
- `nomeWindows`: nome exato em **Painel de Controle → Dispositivos e Impressoras**.
  Se deixar vazio, usa a impressora padrão do Windows.
- Esse modo usa o driver do Windows (texto). O modo **rede** gera um cupom mais bonito e rápido.

### C) Sem impressora (teste)

```json
"impressora": { "tipo": "arquivo", "largura": 48 }
```

### Testar

Com o servidor rodando, abra `http://localhost:3000/admin` e clique em **Testar impressão**.
Se o cupom sair, está pronto.

---

## 2.2 PIX (QR Code para o cliente)

No site, quando o cliente escolhe **PIX**, aparece um QR Code com o **total já incluído**
(ao lado, um "PIX Copia e Cola" copiável). Para funcionar, cadastre a chave PIX da loja
em `config.js`:

```js
pixChave: "contato@pointdord.com.br",
pixNome: "POINT DO RD",
pixCidade: "SALVADOR"
```

- `pixChave`: CPF/CNPJ, e-mail, telefone ou chave aleatória.
- `pixNome`: nome que aparece no app do banco (máx. 25 caracteres, sem acento).
- `pixCidade`: cidade que aparece no app do banco (máx. 15 caracteres, sem acento).

No painel da loja (`admin.html`), os pedidos pagos com PIX ganham o botão
**“PIX — mostrar QR Code”**, que exibe o mesmo QR Code — útil para conferir o pagamento
ou exibir para o cliente no balcão.

O QR Code é gerado na própria página (não usa API externa nem internet além do que já está
carregado). Enquanto a chave não estiver cadastrada, o site mostra um aviso no lugar do QR Code
e a compra continua normalmente.

---

## 3. Firebase: colocar o site no ar e salvar os pedidos

Com o Firebase, o site fica em `https://pizzaria-rd.web.app`, instala no celular como app e
**guarda todos os pedidos** para a loja ver no painel — sem impressora.

> Projeto já criado: **`pizzaria-rd`**. As chaves já estão em `firebase-config.js` e o
> `.firebaserc` já aponta para esse projeto. Falta apenas ativar o login da loja e publicar.

### 3.1 Criar o projeto

1. Acesse https://console.firebase.google.com → **Adicionar projeto**.
2. Dê um nome (ex.: `pointdord`) → **Criar projeto**.

### 3.2 Criar o app Web

1. No projeto criado, clique no ícone **`</>`** (Web) → dê um nome (ex.: `site`) → **Registrar app**.
2. O console mostra um objeto com chaves (`apiKey`, `authDomain`, `projectId`...).
   Copie tudo.
3. Abra o arquivo **`firebase-config.js`** aqui da pasta e cole as chaves no lugar de `COLE AQUI`.

### 3.3 Criar o banco (Firestore)

1. Menu lateral **Compilação → Firestore Database** → **Criar banco de dados**.
2. Escolha o local mais próximo (ex.: `southamerica-east1`) → **Fazer isso mais tarde** (modo
   produção) → **Ativar**.
3. Aba **Regras** → cole o conteúdo do arquivo **`firestore.rules`** → **Publicar**.

> As regras deixam qualquer pessoa CRIAR um pedido (é o checkout do site), mas só a loja
> logada consegue LER ou alterar os pedidos.

### 3.4 Criar o login do proprietário

1. Menu lateral **Compilação → Authentication** → **Vamos começar**.
2. Em **Métodos de login**, ative **E-mail/senha** → Salvar.
3. Aba **Usuários** → **Adicionar usuário** → use o **mesmo e-mail** configurado em
   `config.js` (campo `adminEmail`, padrão `admin@pointdord.com`) e uma senha forte.
4. O e-mail também precisa estar em `firestore.rules`, na função `isProprietario()`.
   Se trocar o e-mail, atualize nos três lugares: `config.js`, `firestore.rules` e
   Authentication > Users.
5. **Somente esse e-mail** consegue abrir o painel e ler os pedidos. Qualquer outra conta
   é desconectada automaticamente, mesmo que consiga se cadastrar no Firebase.
6. O link **“Esqueci minha senha”** no painel envia o e-mail de redefinição para esse endereço.

> **Situação atual:** o provedor E-mail/senha já está ativo e o usuário `admin@pointdord.com`
> já foi criado. A senha inicial deve ser trocada pelo link “Esqueci minha senha” (ou em
> Authentication > Users > redefinir senha).
>
> `admin@pointdord.com` é um endereço de exemplo e pode não receber mensagens. Para o
> proprietário recuperar a senha sozinho, troque para o e-mail real dele nos três lugares
> citados acima e republique as regras.

### 3.5 Publicar

1. Instale o Firebase Tools: `npm install -g firebase-tools`
2. Entre com a sua conta Google: `firebase login`
3. No terminal, dentro da pasta do projeto:

```bat
firebase deploy --only hosting,firestore:rules --project pizzaria-rd
```

> O `.firebaserc` já aponta para `pizzaria-rd`; o `--project` é opcional.

4. Abra `https://pizzaria-rd.web.app` no celular — o site funciona e **instala como app**.

### 3.6 Painel da loja

Abra `https://pizzaria-rd.vercel.app/admin.html` (ou `https://pizzaria-rd.web.app/admin.html`,
se publicar no Firebase Hosting) e faça login com o e-mail/senha do proprietário criados no item 3.4.

Você vê os pedidos chegando **em tempo real** (com aviso sonoro), o total, os itens, e pode:
- **buscar** por nome, telefone, endereço ou número do pedido
- **filtrar** por status: Novos, Em preparo, Saiu p/ entrega, Entregues e Cancelados
- mudar o status: **Em preparo → Saiu p/ entrega → Entregue** (ou **Cancelar**)
- **“Avisar cliente”**: **cada** mudança de status abre o WhatsApp do cliente com a mensagem daquele
  momento já escrita — *“recebemos o seu pedido”*, *“está sendo preparado”*, *“saiu para entrega”*
  ou *“pedido entregue, obrigado!”* — é só tocar em enviar. O Cancelar é o único que não abre mensagem.
  O botão **“Avisar cliente”** do card faz a mesma coisa a qualquer momento, sem mudar o status.
- abrir o WhatsApp do cliente para falar sobre o pedido
- pedidos com pagamento em **PIX** ganham o botão **“PIX — mostrar QR Code”** (QR do pagamento)

**Botões de controle (no topo do painel):**

- **Sangria** — abre um relatório com o faturamento de **hoje**, **este mês** e **este ano**,
  mostrando quantidade de pedidos, ticket médio e o total por forma de pagamento
  (PIX, Dinheiro, Cartão). Pedidos **cancelados não entram** no faturamento, mas aparecem
  contados à parte. O botão **Atualizar** recalcula na hora.
- **Limpar pedidos** — apaga **todos** os pedidos salvos no Firebase. Para evitar acidente,
  é preciso digitar **LIMPAR** antes de confirmar. A ação não pode ser desfeita e também zera
  o histórico usado pela sangria; os números dos pedidos continuam de onde pararam.

> Com o site publicado no Firebase você NÃO precisa de computador ligado nem de servidor
> rodando — nem para salvar os pedidos, nem para ver o painel.

### 3.7 O que NÃO publica

O arquivo `firebase.json` já está configurado para **ignorar** a pasta `servidor/`, o `LEIA-ME.md`
e os arquivos internos. Ou seja: o código do servidor de impressão e este guia continuam só no
seu computador.

### 3.8 Publicar na Vercel (alternativa ao Firebase Hosting)

O site é 100% estático e funciona na Vercel sem servidor:

1. Suba o repositório para o GitHub (o projeto já está conectado ao remoto).
2. Na Vercel, importe o repositório e publique. **Não precisa de build**: o site é servido
   direto da raiz do projeto.
3. O arquivo `.vercelignore` mantém a pasta `servidor/`, este guia e os arquivos internos fora
   do site público.
4. O arquivo `vercel.json` evita cache antigo do `sw.js`, `config.js`, `firebase-config.js` e
   `manifest.json`.

**Endereços publicados:**

| O quê | Endereço |
| --- | --- |
| Site / cardápio | https://pizzaria-rd.vercel.app |
| Painel do proprietário | https://pizzaria-rd.vercel.app/admin.html |

> As regras do Firestore já estão publicadas e o login do proprietário já está ativo.
> Para publicar as regras novamente depois de editar `firestore.rules`, rode
> `firebase deploy --only firestore:rules` na pasta do projeto.

> Para trocar o e-mail do proprietário, atualize `config.js` (campo `adminEmail`),
> `firestore.rules` (função `isProprietario()`), crie o novo usuário em
> Authentication > Users e republique as regras.

### 3.9 Trocar as fotos do cardápio

As fotos ficam em `imagem/cardapio/`. Cada sabor aponta para um arquivo em `script.js`
(campo `image`).

- **Jeito mais simples (recomendado agora):** no GitHub, abra `imagem/cardapio/`, clique em
  **Add file → Upload files**, envie a foto com o mesmo nome do arquivo atual
  (ex.: `calabresa.jpg`) e confirme. A Vercel publica sozinha em seguida.
- **Sem mexer no código:** o campo `image` aceita uma URL completa (Cloudinary, ImgBB etc.).
  Basta trocar o caminho no `script.js`.
- **Upload pelo painel (futuro):** é possível adicionar uma aba de imagens no `admin.html`
  usando o Firebase Storage; aí a loja troca as fotos sem passar pelo GitHub.
- **Se faltar foto:** o site usa automaticamente `imagem/cardapio/pizza-padrao.jpg` — tanto
  quando o sabor não tem `image` quanto quando o arquivo falha ao carregar.

> Dica: mantenha as fotos em JPG, com ~1200px de largura e abaixo de 200 KB, para o site abrir
> rápido no celular.

### 3.10 Salgados (pastel e coxinha)

O catálogo de salgados fica em `script.js`, no array `salgados`:

```js
{ id: "pastel", nome: "Pastel", preco: 15, emoji: "🥟", descricao: "...", tags: ["Feito na hora"], image: "" }
```

- Cada salgado entra direto no carrinho, sem escolher tamanho ou sabor.
- `preco` é o valor unitário; `emoji` aparece no card e no carrinho quando não há foto.
- Para usar uma foto, preencha `image` com o caminho do arquivo (ex.: `"imagem/cardapio/pastel.jpg"`).
- Para adicionar outro salgado, copie um item, troque `id`, `nome`, `preco` e `emoji`.
- No painel `admin.html` e no cupom, os salgados aparecem como **“2x Pastel (salgado)”**.

> Situação atual: **Pastel R$ 15,00** e **Coxinha R$ 10,00**, sem foto (usando emoji).

---

## 4. Ligar o site publicado ao servidor da loja (só com impressora)

O servidor da impressora fica no computador da loja. Para o site publicado conseguir falar com
ele, use um túnel gratuito do **Cloudflare**:

1. Baixe o `cloudflared` em https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Com o servidor rodando (`iniciar.bat`), abra outro terminal e rode:

```bat
cloudflared tunnel --url http://localhost:3000
```

3. Ele mostra um endereço tipo `https://algo-aleatorio.trycloudflare.com`.
4. Coloque esse endereço em `config.js` → `api`.

Pronto: o cliente pede no celular, o pedido cai no servidor da loja e sai na impressora.

> O endereço do túnel gratuito muda quando o computador reinicia. Para um endereço fixo,
> crie um túnel nomeado no painel da Cloudflare (também gratuito).

---

## 5. Instalar como app no celular

- **Android (Chrome):** abra o site → menu ⋮ → **Instalar app** (ou toque no aviso "Instale o app").
- **iPhone (Safari):** abra o site → botão **Compartilhar** → **Adicionar à Tela de Início**.

> Dentro do WhatsApp o navegador é limitado e **não** permite instalar. Se o cliente abrir o link
> pelo WhatsApp, o site mostra um aviso para abrir no Chrome/Safari.

---

## 6. Segurança (leia antes de expor o servidor)

### 6.1 Token do painel local (obrigatório)

O painel local mostra **nome, telefone e endereço dos clientes**. Por isso o servidor
de impressão agora **exige um token** em todas as rotas administrativas.

Na primeira execução o servidor gera um token aleatório e o salva em
`servidor/config.json` (que está no `.gitignore` e **não** vai para o GitHub).
O token aparece no console ao iniciar:

```
Token do painel (guarde em segredo):
3f9c... (48 caracteres)
```

Abra `http://localhost:3000/admin`, clique em **Token** e cole esse valor.
Ele fica salvo só no navegador da loja. Para trocar o token, pare o servidor,
apague o valor em `servidor/config.json` → `"seguranca": { "token": "" }` e
inicie de novo.

> O token **nunca** deve ir na URL. Se você usou links antigos com `?token=...`,
> o painel agora guarda o token e limpa o endereço sozinho.
>
> **Nunca** exponha o servidor na internet sem HTTPS (Cloudflare Tunnel/ngrok).
> HTTP puro envia o token e os pedidos sem criptografia.
>
> Se o site usar um domínio próprio (ex.: `https://pedidos.sualoja.com.br`) e for
> esse domínio que chama o servidor, adicione-o em `servidor/config.json`:
>
> ```json
> "seguranca": { "token": "...", "origens": ["https://pedidos.sualoja.com.br"] }
> ```

### 6.2 Firestore (painel da loja)

As regras em `firestore.rules` já estão publicadas e fazem o seguinte:

- qualquer pessoa pode **criar** um pedido, com validação de tipos, tamanhos e status;
- **ler, alterar ou apagar** pedidos: somente o e-mail `admin@pointdord.com` logado;
- o painel só pode alterar o campo `status` (não dá para forjar total ou cliente);
- contadores do número do pedido só podem ser **lidos** e **incrementados de 1 em 1**.

Ao mudar as regras, publique com:

```bash
firebase deploy --only firestore:rules
```

### 6.3 Conta do proprietário (faça agora)

O e-mail `admin@pointdord.com` é um **placeholder** e o domínio `pointdord.com`
não existe. Isso significa que:

- o link “Esqueci minha senha” **não entrega** o e-mail;
- se alguém registrar esse domínio no futuro, pode tentar recuperar a conta.

Recomendado:

1. Crie um e-mail real do proprietário (Gmail, Outlook etc.).
2. No Firebase Console → **Authentication → Users**, adicione o novo e-mail e
   redefina a senha; apague o usuário `admin@pointdord.com`.
3. Troque o e-mail em `config.js` (`adminEmail`) **e** em `firestore.rules`
   (função `isProprietario`) e publique as regras de novo.
4. Ative **MFA** (Authentication → Sign-in method → Multi-factor authentication)
   para a conta do proprietário.
5. Mantenha o cadastro público (signup) **desativado** em Authentication → Settings.

### 6.4 API key do Firebase

A `apiKey` em `firebase-config.js` é pública por definição — quem protege os dados
são as regras do Firestore. Mesmo assim, restrinja a chave no Google Cloud:

1. Google Cloud Console → **APIs e serviços → Credenciais** → chave `Browser key`.
2. Em **Restrições de aplicativo**, escolha **Sites** e adicione:
   `https://pizzaria-rd.vercel.app/*`, `https://pizzaria-rd.web.app/*`,
   `http://localhost:*/*`.
3. Em **Restrições de API**, permita apenas Identity Toolkit, Firestore e
   Firebase Installations (e o que o site realmente usa).

Opcional: ative o **App Check** (Firebase Console → App Check) com reCAPTCHA v3
para reduzir abuso na criação de pedidos.

### 6.5 O que já está protegido no código

- Painel `admin.html`: todos os campos vindos do banco são escapados (sem XSS);
  ao sair, o painel limpa a tela, o listener e o cache local do Firestore.
- Servidor local: bloqueia `../`, `%2f`, `//servidor`, arquivos ocultos e
  `node_modules`; token só via cabeçalho `x-token`; CORS restrito aos domínios
  do site; cabeçalhos de segurança e CSP; textos dos pedidos são limpos antes de
  ir para a impressora (sem injeção de comandos ESC/POS).
- Site: cabeçalhos de segurança/CSP na Vercel e no Firebase Hosting, `robots.txt`
  bloqueando `/admin.html` e imagens sem metadados de GPS.

### 6.6 Rotina de backup e privacidade (LGPD)

- Faça backup de `servidor/dados/` (pedidos e cupons) e guarde offline.
- Apague pedidos antigos pelo painel (**Limpar pedidos**) ou pelo Firestore.
- Não compartilhe prints com dados de clientes em grupos/repositórios.
- Se um pedido chegar com dados de outra pessoa, apague o registro.
- Em caso de vazamento, troque o token do painel, a senha do Firebase e as
  chaves da API imediatamente.

---

## 7. Iniciar junto com o Windows

1. Pressione `Win + R`, digite `shell:startup` e aperte Enter.
2. Crie um atalho para `servidor/iniciar.bat` dentro dessa pasta.

---

## 8. Problemas comuns

| Problema | Solução |
| --- | --- |
| "Impressora não configurada" no site | Confira `servidor/config.json` e clique em Testar impressão no painel |
| Painel diz "Firebase ainda não configurado" | Preencha `firebase-config.js` com as chaves do seu projeto (item 3.2) |
| QR Code PIX não aparece | Cadastre `pixChave` em `config.js` (seção 2.2) |
| Pedidos não aparecem no painel | Publique as regras do Firestore (item 3.3) e confira se você está logado |
| Site publicado, painel pede login de novo toda hora | Normal: o login fica salvo no navegador; use "Lembrar"/mantenha o navegador aberto |
| Cupom sai com acentos errados | Use o modo `rede` (ESC/POS) em vez de `windows` |
| Nada imprime no modo rede | Teste o IP no navegador: `http://IP:9100` deve recusar conexão (isso é normal). Confirme o IP no teste de página da impressora |
| App não instala no celular | O site precisa estar em HTTPS (veja item 3) |
| Pedido não abre no WhatsApp | Verifique o número em `config.js` → `whatsapp` (55 + DDD + número, só dígitos) |
| Pedido não chega no servidor | Confira o endereço em `config.js` → `api` e se o túnel/servidor está rodando |
| Alterei o site e o celular mostra a versão antiga | Aumente a versão em `sw.js` (`point-do-rd-v24` → `v25`) |
| Painel local pede token | Veja o token no console do servidor e clique em **Token** (seção 6.1) |
| Perdi o token do painel local | Pare o servidor, apague o valor em `servidor/config.json` → `seguranca.token` e inicie de novo |

---

## Estrutura

```
Pizzaria/
├─ index.html          site/app
├─ admin.html          painel da loja (Firebase)
├─ style.css
├─ script.js           montagem da pizza, carrinho e envio
├─ config.js           WhatsApp da loja, taxa, dados do PIX
├─ pix.js              geração do PIX Copia e Cola (BR Code)
├─ firebase.js         salvar pedido no Firestore
├─ firebase-config.js  chaves do seu projeto Firebase
├─ firebase.json       configuração de publicação (Hosting + regras)
├─ firestore.rules     regras de segurança do banco
├─ manifest.json       configuração do app
├─ sw.js               cache offline
├─ robots.txt          impede indexação do painel
├─ .gitignore          protege config local, dados e segredos
├─ imagem/
│  ├─ Logo-RD.png      arte da marca recortada (fundo transparente)
│  ├─ Logo-RD-fundo-branco.png  arte original com fundo branco
│  ├─ logo-rd-web.png  versão otimizada para site e painel
│  ├─ banner.jpg       imagem de fundo do topo
│  ├─ og-image.jpg     imagem de compartilhamento (WhatsApp/redes)
│  ├─ icons/           ícones do app
│  └─ cardapio/        fotos dos sabores (JPG otimizados)
└─ servidor/
   ├─ server.js        servidor HTTP + API (só se tiver impressora)
   ├─ config.json      configuração local + token (NÃO vai para o Git)
   ├─ config.example.json  modelo de configuração para copiar
   ├─ admin.html       painel local de pedidos (servidor)
   ├─ iniciar.bat      inicia o servidor no Windows
   ├─ lib/cupom.js     layout do cupom
   ├─ lib/impressora.js envio para a térmica
   └─ dados/           pedidos e cupons salvos (modo servidor)
```
