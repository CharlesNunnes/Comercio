# Point do RD — Site + App + Impressora

Este projeto tem três partes:

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

Também dá para abrir o site direto pelo arquivo `index.html` (sem servidor). Nesse caso o pedido
também vai para o WhatsApp normalmente — só não é possível instalar como app (para isso precisa de
HTTPS, veja o item 3).

No modo de teste da impressora (`"tipo": "arquivo"`), o cupom **não sai na impressora**: ele é salvo
em `servidor/dados/cupons/pedido-0001.txt`.

---

## 2. Configurar a impressora (quando chegar)

> Depois de configurar a impressora aqui, abra `config.js` e mude
> `impressaoAutomatica: false` para `true`. Sem isso o site continua enviando pelo WhatsApp.

Abra `servidor/config.json` e escolha o tipo:

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

## 3. Firebase: colocar o site no ar e salvar os pedidos

Com o Firebase, o site fica em `https://SEU-PROJETO.web.app`, instala no celular como app e
**guarda todos os pedidos** para a loja ver no painel — sem impressora.

> Você precisa de uma conta Google (gratuita) e do plano grátis do Firebase (Spark), que serve
> para um lanche desse porte com folga.

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

### 3.4 Criar o login da loja

1. Menu lateral **Compilação → Authentication** → **Vamos começar**.
2. Em **Métodos de login**, ative **E-mail/senha** → Salvar.
3. Aba **Usuários** → **Adicionar usuário** → e-mail e senha da loja → **Adicionar usuário**.

### 3.5 Publicar

1. Instale o Firebase Tools: `npm install -g firebase-tools`
2. Entre com a sua conta Google: `firebase login`
3. No terminal, dentro da pasta do projeto:

```bat
firebase deploy --only hosting,firestore:rules --project SEU-PROJETO
```

> Troque `SEU-PROJETO` pelo ID do seu projeto (aparece no console, em **Configurações do
> projeto → Nome do projeto**). O `.firebaserc` já tem um espaço para esse ID.

4. Abra `https://SEU-PROJETO.web.app` no celular — o site funciona e **instala como app**.

### 3.6 Painel da loja

Abra `https://SEU-PROJETO.web.app/admin.html` e faça login com o e-mail/senha criados no item 3.4.

Você vê os pedidos chegando **em tempo real** (com aviso sonoro), o total, os itens, e pode:
- mudar o status: **Em preparo → Saiu p/ entrega → Entregue** (ou **Cancelar**)
- abrir o WhatsApp do cliente para avisar que a pizza saiu

> Com o site publicado no Firebase você NÃO precisa de computador ligado nem de servidor
> rodando — nem para salvar os pedidos, nem para ver o painel.

### 3.7 O que NÃO publica

O arquivo `firebase.json` já está configurado para **ignorar** a pasta `servidor/`, o `LEIA-ME.md`
e os arquivos internos. Ou seja: o código do servidor de impressão e este guia continuam só no
seu computador.

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

## 6. Segurança (opcional, recomendado)

Se o servidor ficar exposto na internet, coloque um token em `servidor/config.json`:

```json
"seguranca": { "token": "uma-senha-grande-e-dificil" }
```

Depois abra o painel com o token: `https://SEU-SERVIDOR/admin?token=uma-senha-grande-e-dificil`

O site do cliente continua funcionando normalmente (a criação de pedidos é pública).

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
| Pedidos não aparecem no painel | Publique as regras do Firestore (item 3.3) e confira se você está logado |
| Site publicado, painel pede login de novo toda hora | Normal: o login fica salvo no navegador; use "Lembrar"/mantenha o navegador aberto |
| Cupom sai com acentos errados | Use o modo `rede` (ESC/POS) em vez de `windows` |
| Nada imprime no modo rede | Teste o IP no navegador: `http://IP:9100` deve recusar conexão (isso é normal). Confirme o IP no teste de página da impressora |
| App não instala no celular | O site precisa estar em HTTPS (veja item 3) |
| Pedido não abre no WhatsApp | Verifique o número em `config.js` → `whatsapp` (55 + DDD + número, só dígitos) |
| Pedido não chega no servidor | Confira o endereço em `config.js` → `api` e se o túnel/servidor está rodando |
| Alterei o site e o celular mostra a versão antiga | Aumente a versão em `sw.js` (`point-do-rd-v10` → `v11`) |

---

## Estrutura

```
Pizzaria/
├─ index.html          site/app
├─ admin.html          painel da loja (Firebase)
├─ style.css
├─ script.js           montagem da pizza, carrinho e envio
├─ config.js           WhatsApp da loja, taxa de entrega
├─ firebase.js         salvar pedido no Firestore
├─ firebase-config.js  chaves do seu projeto Firebase
├─ firebase.json       configuração de publicação (Hosting + regras)
├─ firestore.rules     regras de segurança do banco
├─ manifest.json       configuração do app
├─ sw.js               cache offline
├─ imagem/
│  ├─ logo.jfif
│  ├─ icons/           ícones do app
│  └─ cardapio/        fotos dos sabores
└─ servidor/
   ├─ server.js        servidor HTTP + API (só se tiver impressora)
   ├─ config.json      configuração da impressora
   ├─ admin.html       painel local de pedidos (servidor)
   ├─ iniciar.bat      inicia o servidor no Windows
   ├─ lib/cupom.js     layout do cupom
   ├─ lib/impressora.js envio para a térmica
   └─ dados/           pedidos e cupons salvos (modo servidor)
```
