/* ============================================================
   Servidor de Pedidos e Impressão - Point do RD
   ------------------------------------------------------------
   - Serve o site (index.html, css, js, imagens)
   - Recebe os pedidos do site em POST /api/pedidos
   - Manda o cupom para a impressora térmica
   - Painel da loja em http://localhost:3000/admin

   Como usar:  node servidor/server.js
   Configuração: servidor/config.json
   ============================================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const { criarCupom } = require("./lib/cupom");
const { imprimirPedido, statusImpressora } = require("./lib/impressora");

const RAIZ_SITE = path.resolve(__dirname, "..");
const ARQ_CONFIG = path.join(__dirname, "config.json");
const ARQ_DADOS = path.join(__dirname, "dados", "pedidos.json");
const ARQ_ADMIN = path.join(__dirname, "admin.html");

const CONFIG_PADRAO = {
    porta: 3000,
    impressora: {
        tipo: "arquivo",
        host: "192.168.0.200",
        portaRede: 9100,
        nomeWindows: "",
        largura: 48,
        copias: 1,
        cortarPapel: true,
        abrirGaveta: false
    },
    seguranca: { token: "" },
    loja: { nome: "POINT DO RD", telefone: "(71) 98858-0935" }
};

// ============================
// CONFIGURAÇÃO
// ============================
function carregarConfig() {
    if (!fs.existsSync(ARQ_CONFIG)) {
        fs.mkdirSync(path.dirname(ARQ_CONFIG), { recursive: true });
        fs.writeFileSync(ARQ_CONFIG, JSON.stringify(CONFIG_PADRAO, null, 2), "utf8");
    }

    try {
        const lido = JSON.parse(fs.readFileSync(ARQ_CONFIG, "utf8"));
        return {
            ...CONFIG_PADRAO,
            ...lido,
            impressora: { ...CONFIG_PADRAO.impressora, ...(lido.impressora || {}) },
            seguranca: { ...CONFIG_PADRAO.seguranca, ...(lido.seguranca || {}) },
            loja: { ...CONFIG_PADRAO.loja, ...(lido.loja || {}) }
        };
    } catch (erro) {
        console.error("[config] config.json inválido, usando padrão:", erro.message);
        return CONFIG_PADRAO;
    }
}

let config = carregarConfig();

// ============================
// TOKEN DO PAINEL
// ============================
// O painel mostra nome, telefone e endereço dos clientes. Se o token ficar
// vazio, qualquer pessoa na mesma rede (ou no túnel) leria esses dados.
// Geramos um token forte automaticamente na primeira execução.
function garantirToken() {
    const atual = String((config.seguranca && config.seguranca.token) || "").trim();
    if (atual) return atual;

    const novo = crypto.randomBytes(24).toString("hex");
    config.seguranca = { ...(config.seguranca || {}), token: novo };
    try {
        fs.writeFileSync(ARQ_CONFIG, JSON.stringify(config, null, 2), "utf8");
    } catch (erro) {
        console.error("[seguranca] Não foi possível salvar o token em config.json:", erro.message);
    }
    return novo;
}

const tokenPainel = garantirToken();

// ============================
// BANCO SIMPLES (JSON)
// ============================
let pedidos = [];

function carregarPedidos() {
    try {
        if (fs.existsSync(ARQ_DADOS)) {
            pedidos = JSON.parse(fs.readFileSync(ARQ_DADOS, "utf8"));
            if (!Array.isArray(pedidos)) pedidos = [];
        }
    } catch (erro) {
        console.error("[dados] Não foi possível ler pedidos.json:", erro.message);
        pedidos = [];
    }
}

let salvarAgendado = null;
function salvarPedidos() {
    if (salvarAgendado) return;
    salvarAgendado = setTimeout(() => {
        salvarAgendado = null;
        try {
            fs.mkdirSync(path.dirname(ARQ_DADOS), { recursive: true });
            fs.writeFileSync(ARQ_DADOS, JSON.stringify(pedidos.slice(-500), null, 2), "utf8");
        } catch (erro) {
            console.error("[dados] Erro ao salvar pedidos:", erro.message);
        }
    }, 250);
}

function dataHoje() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function proximoNumero() {
    const hoje = dataHoje();
    const doDia = pedidos.filter((p) => (p.criadoEm || "").slice(0, 10) === hoje);
    return doDia.length + 1;
}

// ============================
// UTILITÁRIOS HTTP
// ============================
const TIPOS = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".jfif": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8"
};

function cabecalhosCors(req, res) {
    const origem = req.headers.origin;
    const extras = Array.isArray(config.seguranca && config.seguranca.origens)
        ? config.seguranca.origens.map((o) => String(o).trim()).filter(Boolean)
        : [];
    const permitida = origem && (
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origem) ||
        origem === "https://pizzaria-rd.web.app" ||
        /^https:\/\/pizzaria-rd(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origem) ||
        extras.includes(origem)
    );

    if (permitida) {
        res.setHeader("Access-Control-Allow-Origin", origem);
        res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-token");
    res.setHeader("Access-Control-Max-Age", "86400");
}

const CABECALHOS_SEGURANCA = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdnjs.cloudflare.com https://apis.google.com https://www.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com; frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://www.google.com; worker-src 'self' blob:; manifest-src 'self'"
};

function responderJson(res, status, dados) {
    const corpo = JSON.stringify(dados);
    res.writeHead(status, {
        ...CABECALHOS_SEGURANCA,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Length": Buffer.byteLength(corpo)
    });
    res.end(corpo);
}

function lerCorpo(req, limite = 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let total = 0;
        const partes = [];
        req.on("data", (pedaco) => {
            total += pedaco.length;
            if (total > limite) {
                reject(new Error("Corpo da requisição muito grande."));
                req.destroy();
                return;
            }
            partes.push(pedaco);
        });
        req.on("end", () => {
            if (!partes.length) return resolve(null);
            try {
                resolve(JSON.parse(Buffer.concat(partes).toString("utf8")));
            } catch (erro) {
                reject(new Error("JSON inválido."));
            }
        });
        req.on("error", reject);
    });
}

function tokenValido(req) {
    const esperado = String(tokenPainel || "");
    if (!esperado) return false;

    const recebido = String(req.headers["x-token"] || "");
    const a = Buffer.from(esperado);
    const b = Buffer.from(recebido);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function ipDoCliente(req) {
    const cf = req.headers["cf-connecting-ip"];
    if (cf) return String(cf).split(",")[0].trim();
    const encaminhado = req.headers["x-forwarded-for"];
    if (encaminhado) return String(encaminhado).split(",")[0].trim();
    return req.socket.remoteAddress || "desconhecido";
}

// ============================
// SERVIDOR DE ARQUIVOS
// ============================
function negarArquivo(res, status, mensagem) {
    res.writeHead(status, {
        ...CABECALHOS_SEGURANCA,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
    });
    res.end(mensagem);
}

function servirArquivo(req, res, caminhoRelativo, interno = false) {
    let rel;
    try {
        rel = decodeURIComponent(String(caminhoRelativo).split("?")[0]);
    } catch (erro) {
        negarArquivo(res, 400, "Caminho inválido.");
        return;
    }

    // Barra invertida, byte nulo e caracteres de controle nunca são válidos
    // em uma URL de arquivo estático.
    if (/[\\\0\u0001-\u001f\u007f]/.test(rel)) {
        negarArquivo(res, 400, "Caminho inválido.");
        return;
    }

    if (rel === "/" || rel === "") rel = "/index.html";
    if (rel[0] !== "/") rel = "/" + rel;

    // Analisa segmento por segmento: bloqueia "..", ".", barras duplicadas
    // (//servidor), arquivos ocultos (.git, .env) e node_modules.
    const segmentos = rel.split("/").slice(1);
    for (const segmento of segmentos) {
        const baixo = segmento.toLowerCase();
        if (!segmento || segmento === "." || segmento === "..") {
            negarArquivo(res, 403, "Acesso negado.");
            return;
        }
        if (baixo.startsWith(".") || baixo === "node_modules") {
            negarArquivo(res, 403, "Acesso negado.");
            return;
        }
    }

    // Protege a pasta do servidor (config.json tem o token do painel e
    // dados/ tem os pedidos dos clientes).
    if (!interno && segmentos[0] && segmentos[0].toLowerCase() === "servidor") {
        negarArquivo(res, 403, "Acesso negado.");
        return;
    }

    const caminho = path.resolve(RAIZ_SITE, "." + rel);
    const relativo = path.relative(RAIZ_SITE, caminho);
    if (!relativo || relativo.startsWith("..") || path.isAbsolute(relativo)) {
        negarArquivo(res, 403, "Acesso negado.");
        return;
    }

    // A pasta interna do servidor só pode servir admin.html.
    if (!interno && relativo.split(path.sep)[0].toLowerCase() === "servidor") {
        negarArquivo(res, 403, "Acesso negado.");
        return;
    }
    if (interno && relativo !== path.join("servidor", "admin.html")) {
        negarArquivo(res, 403, "Acesso negado.");
        return;
    }

    fs.stat(caminho, (erro, info) => {
        if (erro || !info.isFile()) {
            negarArquivo(res, 404, "Arquivo não encontrado.");
            return;
        }

        const ext = path.extname(caminho).toLowerCase();
        const tipo = TIPOS[ext] || "application/octet-stream";
        const cache = [".html", ".json", ".js", ".css"].includes(ext)
            ? "no-cache"
            : "public, max-age=86400";

        const cabecalhos = {
            ...CABECALHOS_SEGURANCA,
            "Content-Type": tipo,
            "Content-Length": info.size,
            "Cache-Control": cache
        };

        // Páginas HTML recebem CSP; o painel não pode ser cacheado
        // nem indexado por buscadores.
        if (ext === ".html") {
            cabecalhos["Content-Security-Policy"] = CABECALHOS_SEGURANCA["Content-Security-Policy"];
        }
        if (relativo === path.join("servidor", "admin.html")) {
            cabecalhos["Cache-Control"] = "no-store";
            cabecalhos["X-Robots-Tag"] = "noindex, nofollow";
        }

        res.writeHead(200, cabecalhos);

        if (req.method === "HEAD") {
            res.end();
            return;
        }

        fs.createReadStream(caminho).pipe(res);
    });
}

// ============================
// IMPRESSÃO / PEDIDOS
// ============================
async function imprimir(pedido) {
    const cupom = criarCupom(pedido, {
        largura: config.impressora.largura,
        nomeLoja: config.loja.nome,
        telefone: config.loja.telefone
    });

    const resultado = await imprimirPedido(config.impressora, pedido, cupom.blocos);

    pedido.impresso = resultado.ok;
    pedido.mensagemImpressao = resultado.mensagem;
    pedido.arquivoCupom = resultado.arquivo || null;
    pedido.tentativas = (pedido.tentativas || 0) + 1;

    if (!resultado.ok) {
        console.warn(`[impressora] Pedido #${pedido.numero}: ${resultado.mensagem}`);
    } else {
        console.log(`[impressora] Pedido #${pedido.numero} impresso.`);
    }

    salvarPedidos();
    return resultado;
}

/* Remove caracteres de controle (ESC/POS) e limita o tamanho do texto. */
function limparTexto(valor, limite) {
    const texto = String(valor == null ? "" : valor)
        .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return limite ? texto.slice(0, limite) : texto;
}

function validarPedido(dados) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) return "Pedido inválido.";

    const nome = limparTexto(dados.nome, 80);
    if (nome.length < 2) return "Informe o nome do cliente.";

    const endereco = limparTexto(dados.endereco, 200);
    if (endereco.length < 5) return "Informe o endereço de entrega.";

    if (!Array.isArray(dados.itens) || dados.itens.length === 0) return "O pedido está sem itens.";
    if (dados.itens.length > 50) return "Pedido com itens demais.";

    for (const item of dados.itens) {
        if (!item || typeof item !== "object") return "Item do pedido inválido.";

        const tipo = item.tipo === "salgado" ? "salgado" : "pizza";
        const tamanho = limparTexto(item.tamanho, 40);
        if (!tamanho) return "Item do pedido sem tamanho.";

        if (tipo === "pizza" && (!Array.isArray(item.sabores) || item.sabores.length === 0)) {
            return "Item do pedido sem sabores.";
        }
        if (Array.isArray(item.sabores) && item.sabores.length > 10) {
            return "Item do pedido com sabores demais.";
        }

        const quantidade = Number(item.quantidade);
        if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 50) {
            return "Quantidade inválida no pedido.";
        }

        const preco = Number(item.preco);
        if (!Number.isFinite(preco) || preco < 0 || preco > 1000) {
            return "Preço inválido no pedido.";
        }

        const fatias = Number(item.fatias || 0);
        if (!Number.isFinite(fatias) || fatias < 0 || fatias > 12) {
            return "Número de fatias inválido no pedido.";
        }
    }

    const total = Number(dados.total);
    if (!Number.isFinite(total) || total < 0 || total > 100000) return "Total inválido no pedido.";

    const taxa = Number(dados.taxaEntrega || 0);
    if (!Number.isFinite(taxa) || taxa < 0 || taxa > 1000) return "Taxa de entrega inválida.";

    return null;
}

async function criarPedido(dados, ip) {
    const agora = new Date().toISOString();

    const pedido = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        numero: proximoNumero(),
        status: "novo",
        nome: limparTexto(dados.nome, 80),
        telefone: limparTexto(dados.telefone, 30),
        endereco: limparTexto(dados.endereco, 200),
        referencia: limparTexto(dados.referencia, 120),
        pagamento: limparTexto(dados.pagamento || "PIX", 40),
        troco: limparTexto(dados.troco, 40),
        observacao: limparTexto(dados.observacao, 300),
        taxaEntrega: Number(dados.taxaEntrega) || 0,
        total: Number(dados.total) || 0,
        itens: dados.itens.map((item) => ({
            tipo: item.tipo === "salgado" ? "salgado" : "pizza",
            tamanho: limparTexto(item.tamanho, 40),
            fatias: Math.max(0, Math.min(12, Math.floor(Number(item.fatias) || 0))),
            sabores: (Array.isArray(item.sabores) ? item.sabores : [])
                .map((s) => limparTexto(s, 60))
                .filter(Boolean)
                .slice(0, 10),
            quantidade: Math.max(1, Math.min(50, Math.floor(Number(item.quantidade) || 1))),
            preco: Math.max(0, Math.min(1000, Number(item.preco) || 0))
        })),
        origem: limparTexto(dados.origem || "site", 40),
        criadoEm: agora,
        ip: ip || null,
        impresso: false,
        tentativas: 0
    };

    pedidos.push(pedido);
    salvarPedidos();

    await imprimir(pedido);

    return pedido;
}

// Controle simples de spam: máximo de pedidos por IP por minuto.
const limitePedidos = new Map();

function podePedir(ip) {
    const agora = Date.now();
    const janela = 60 * 1000;
    const maximo = 30;

    const registro = limitePedidos.get(ip) || [];
    const recentes = registro.filter((t) => agora - t < janela);
    recentes.push(agora);
    limitePedidos.set(ip, recentes);

    return recentes.length <= maximo;
}

// ============================
// ROTAS
// ============================
async function tratarApi(req, res, url) {
    const rota = url.pathname;
    const metodo = req.method;

    if (metodo === "OPTIONS") {
        cabecalhosCors(req, res);
        res.writeHead(204);
        res.end();
        return;
    }

    cabecalhosCors(req, res);

    // Status público (usado pelo site para saber se a impressora responde)
    if (rota === "/api/status" && metodo === "GET") {
        const impressora = await statusImpressora(config.impressora);
        const hoje = dataHoje();
        responderJson(res, 200, {
            ok: true,
            loja: config.loja.nome,
            impressora,
            pedidosHoje: pedidos.filter((p) => (p.criadoEm || "").slice(0, 10) === hoje).length,
            pendentes: pedidos.filter((p) => !p.impresso).length,
            hora: new Date().toISOString()
        });
        return;
    }

    // Criação de pedido (público)
    if (rota === "/api/pedidos" && metodo === "POST") {
        const ip = ipDoCliente(req);

        if (!podePedir(ip)) {
            responderJson(res, 429, { ok: false, erro: "Muitos pedidos seguidos. Aguarde um minuto." });
            return;
        }

        let dados;
        try {
            dados = await lerCorpo(req);
        } catch (erro) {
            responderJson(res, 400, { ok: false, erro: erro.message });
            return;
        }

        const problema = validarPedido(dados);
        if (problema) {
            responderJson(res, 400, { ok: false, erro: problema });
            return;
        }

        const pedido = await criarPedido(dados, ip);

        responderJson(res, 201, {
            ok: true,
            pedido: {
                id: pedido.id,
                numero: pedido.numero,
                status: pedido.status,
                impresso: pedido.impresso,
                mensagemImpressao: pedido.mensagemImpressao,
                total: pedido.total
            }
        });
        return;
    }

    // Daqui para baixo, apenas o painel da loja (protegido por token).
    if (!tokenValido(req)) {
        responderJson(res, 401, { ok: false, erro: "Token inválido." });
        return;
    }

    if (rota === "/api/pedidos" && metodo === "GET") {
        const limite = Math.min(200, Math.max(1, Number(url.searchParams.get("limite")) || 50));
        const lista = pedidos.slice(-limite).reverse();
        responderJson(res, 200, { ok: true, pedidos: lista });
        return;
    }

    const reimprimir = rota.match(/^\/api\/pedidos\/([^/]+)\/reimprimir$/);
    if (reimprimir && metodo === "POST") {
        const pedido = pedidos.find((p) => p.id === reimprimir[1] || String(p.numero) === reimprimir[1]);
        if (!pedido) {
            responderJson(res, 404, { ok: false, erro: "Pedido não encontrado." });
            return;
        }
        const resultado = await imprimir(pedido);
        responderJson(res, 200, { ok: resultado.ok, mensagem: resultado.mensagem, pedido });
        return;
    }

    const mudarStatus = rota.match(/^\/api\/pedidos\/([^/]+)\/status$/);
    if (mudarStatus && (metodo === "PATCH" || metodo === "POST")) {
        const pedido = pedidos.find((p) => p.id === mudarStatus[1]);
        if (!pedido) {
            responderJson(res, 404, { ok: false, erro: "Pedido não encontrado." });
            return;
        }
        let dados = null;
        try { dados = await lerCorpo(req); } catch (e) { /* opcional */ }
        const novo = dados && dados.status;
        if (!["novo", "em_preparo", "saiu_entrega", "entregue", "cancelado"].includes(novo)) {
            responderJson(res, 400, { ok: false, erro: "Status inválido." });
            return;
        }
        pedido.status = novo;
        salvarPedidos();
        responderJson(res, 200, { ok: true, pedido });
        return;
    }

    if (rota === "/api/teste-impressao" && metodo === "POST") {
        const teste = {
            numero: 0,
            nome: "TESTE DE IMPRESSAO",
            telefone: "",
            endereco: "Se este cupom saiu, a impressora esta funcionando!",
            pagamento: "TESTE",
            taxaEntrega: 0,
            total: 0,
            itens: [{ tamanho: "Grande", fatias: 8, sabores: ["Calabresa", "Mussarela"], quantidade: 1, preco: 0 }],
            criadoEm: new Date().toISOString()
        };
        const resultado = await imprimir(teste);
        responderJson(res, 200, { ok: resultado.ok, mensagem: resultado.mensagem });
        return;
    }

    if (rota === "/api/config" && metodo === "GET") {
        responderJson(res, 200, {
            ok: true,
            impressora: { ...config.impressora, host: config.impressora.host ? "configurado" : "" },
            loja: { ...config.loja }
        });
        return;
    }

    responderJson(res, 404, { ok: false, erro: "Rota não encontrada." });
}

const servidor = http.createServer(async (req, res) => {
    let url;
    try {
        url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    } catch (erro) {
        res.writeHead(400);
        res.end("Requisição inválida.");
        return;
    }

    if (url.pathname.startsWith("/api/")) {
        try {
            await tratarApi(req, res, url);
        } catch (erro) {
            console.error("[api] Erro:", erro);
            if (!res.headersSent) {
                responderJson(res, 500, { ok: false, erro: "Erro interno no servidor." });
            }
        }
        return;
    }

    if (url.pathname === "/admin" || url.pathname === "/admin/") {
        servirArquivo(req, res, "/servidor/admin.html", true);
        return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405);
        res.end("Método não permitido.");
        return;
    }

    servirArquivo(req, res, url.pathname);
});

// ============================
// FILA DE REEXPRESSÃO
// ============================
async function tentarPendentes() {
    const pendentes = pedidos.filter((p) => !p.impresso && p.status !== "cancelado" && (p.tentativas || 0) < 8);

    for (const pedido of pendentes) {
        // Evita reprocessar pedidos antigos (mais de 2 horas)
        const idade = Date.now() - new Date(pedido.criadoEm).getTime();
        if (idade > 2 * 60 * 60 * 1000) continue;

        const resultado = await imprimir(pedido);
        if (resultado.ok) console.log(`[fila] Pedido #${pedido.numero} reimpresso.`);
    }
}

setInterval(tentarPendentes, 60 * 1000);

// ============================
// INICIALIZAÇÃO
// ============================
carregarPedidos();

const porta = Number(process.env.PORT || config.porta || 3000);

servidor.listen(porta, "0.0.0.0", () => {
    const ips = Object.values(require("os").networkInterfaces())
        .flat()
        .filter((i) => i && i.family === "IPv4" && !i.internal)
        .map((i) => i.address);

    console.log("");
    console.log("  ============================================");
    console.log(`   ${config.loja.nome} - Servidor de Pedidos`);
    console.log("  ============================================");
    console.log(`   Site:   http://localhost:${porta}`);
    console.log(`   Painel: http://localhost:${porta}/admin`);
    ips.forEach((ip) => console.log(`   Rede:   http://${ip}:${porta}`));
    console.log(`   Impressora: ${config.impressora.tipo}`);
    if (config.impressora.tipo === "rede") {
        console.log(`   Endereço: ${config.impressora.host}:${config.impressora.portaRede}`);
    }
    if (config.impressora.tipo === "windows") {
        console.log(`   Impressora do Windows: ${config.impressora.nomeWindows || "(padrão)"}`);
    }
    console.log("  ============================================");
    console.log("   Token do painel (guarde em segredo):");
    console.log(`   ${tokenPainel}`);
    console.log("   O painel pede esse token na primeira vez que abrir.");
    console.log("   Nunca compartilhe o token nem exponha o servidor sem HTTPS.");
    console.log("  ============================================");
    console.log("");
});

process.on("SIGINT", () => {
    console.log("\nEncerrando...");
    try {
        fs.mkdirSync(path.dirname(ARQ_DADOS), { recursive: true });
        fs.writeFileSync(ARQ_DADOS, JSON.stringify(pedidos.slice(-500), null, 2), "utf8");
    } catch (e) { /* ignora */ }
    process.exit(0);
});
