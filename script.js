// ============================
// DADOS - Point do RD
// ============================
const tamanhos = [
    {
        id: "media",
        label: "Média",
        sabores: 1,
        preco: 30.00,
        fatias: 6,
        badge: "Para 1–2 pessoas",
        descricao: "A medida certa para matar a fome sem sobrar.",
        icone: "fa-pizza-slice"
    },
    {
        id: "grande",
        label: "Grande",
        sabores: 2,
        preco: 40.00,
        fatias: 8,
        badge: "Para 2–3 pessoas",
        descricao: "A favorita para dividir e provar mais de um sabor.",
        icone: "fa-fire",
        destaque: true
    },
    {
        id: "familia",
        label: "Família",
        sabores: 3,
        preco: 50.00,
        fatias: 12,
        badge: "Para 3–4 pessoas",
        descricao: "Mesa cheia, três sabores e ninguém fica de fora.",
        icone: "fa-users"
    }
];

const sabores = [
    // === TRADICIONAIS ===
    {
        id: 1, name: "Calabresa", categoria: "tradicional", image: "imagem/cardapio/calabresa.jpg",
        descricao: "Calabresa fatiada, cebola roxa e mussarela derretida.",
        tags: ["Clássica", "Mais pedida"], destaque: true
    },
    {
        id: 2, name: "Mista", categoria: "tradicional", image: "imagem/cardapio/mista.jpg",
        descricao: "Mussarela, presunto, calabresa, cebola e tomate.",
        tags: ["Completa"]
    },
    {
        id: 3, name: "Mussarela", categoria: "tradicional", image: "imagem/cardapio/mussarela.jpg",
        descricao: "Mussarela derretida, tomate fresco e orégano.",
        tags: ["Clássica"]
    },
    {
        id: 4, name: "Portuguesa", categoria: "tradicional", image: "imagem/cardapio/portuguesa.jpg",
        descricao: "Presunto, ovos, cebola, azeitona e mussarela.",
        tags: ["Tradicional"]
    },
    {
        id: 5, name: "Três Queijos", categoria: "tradicional", image: "imagem/cardapio/tres-queijos.jpg",
        descricao: "Mussarela, provolone e parmesão gratinados.",
        tags: ["Cremosa"]
    },
    {
        id: 6, name: "Frango com Catupiry", categoria: "tradicional", image: "imagem/cardapio/frango-catupiry.jpg",
        descricao: "Frango desfiado temperado e Catupiry cremoso.",
        tags: ["Mais pedida", "Cremosa"], destaque: true
    },
    {
        id: 7, name: "Atum", categoria: "tradicional", image: "imagem/cardapio/atum.jpg",
        descricao: "Atum, cebola roxa, azeitona e mussarela.",
        tags: ["Leve"]
    },
    {
        id: 8, name: "Bacon", categoria: "tradicional", image: "imagem/cardapio/bacon.jpg",
        descricao: "Bacon crocante, mussarela e cebola caramelizada.",
        tags: ["Mais pedida", "Intensa"], destaque: true
    },

    // === DOCES ===
    {
        id: 12, name: "Romeu e Julieta", categoria: "doce", image: "imagem/cardapio/romeu-e-julieta.jpg",
        descricao: "Goiabada cremosa com queijo minas derretido.",
        tags: ["Doce", "Clássica"]
    },
    {
        id: 13, name: "Brigadeiro", categoria: "doce", image: "imagem/cardapio/brigadeiro.jpg",
        descricao: "Chocolate ao leite, granulado e um toque de creme.",
        tags: ["Doce", "Mais pedida"], destaque: true
    },
    {
        id: 14, name: "Doce de Leite", categoria: "doce", image: "imagem/cardapio/doce-de-leite.jpg",
        descricao: "Doce de leite cremoso com raspas de chocolate.",
        tags: ["Doce"]
    }

    // === ESPECIAIS ===
    // Para adicionar um sabor especial, copie uma linha acima e use:
    // { id: 20, name: "Nome do Sabor", categoria: "especial", image: "imagem/cardapio/arquivo.jpg", descricao: "...", tags: ["Especial"] }
];

// ============================
// SALGADOS
// ============================
// Catálogo simples: cada item já tem preço fixo e entra direto no carrinho.
// Para adicionar outro salgado, copie um item e troque id, nome, preco e emoji.
// Se tiver foto, coloque em "image" (ex.: "imagem/cardapio/pastel.jpg").
const salgados = [
    {
        id: "pastel",
        nome: "Pastel",
        preco: 15,
        emoji: "🥟",
        descricao: "Massa fina e crocante, frito na hora. Recheio à escolha da casa.",
        tags: ["Feito na hora"],
        image: "imagem/cardapio/pastel.jpg"
    },
    {
        id: "coxinha",
        nome: "Coxinha",
        preco: 10,
        emoji: "🍗",
        descricao: "Recheio cremoso de frango com casquinha crocante.",
        tags: ["Mais pedida"],
        image: "imagem/cardapio/coxinha.jpg"
    }
];

const NOMES_CATEGORIA = {
    tradicional: "Tradicionais",
    doce: "Doces",
    especial: "Especiais"
};

// ============================
// CONFIGURAÇÕES
// ============================
const CONFIG = Object.assign({
    api: "",
    whatsapp: "5571988580935",
    taxaEntrega: 0,
    tempoEntrega: "40 a 60 minutos",
    impressaoAutomatica: false,
    nomeLoja: "POINT DO RD"
}, window.POINT_RD || {});

const API_BASE = String(CONFIG.api || "").replace(/\/+$/, "");
const API_PEDIDOS = `${API_BASE}/api/pedidos`;
const API_STATUS = `${API_BASE}/api/status`;

// ============================
// ESTADO DO PEDIDO
// ============================
let estado = {
    passo: 1,
    tamanhoSelecionado: null,
    saboresSelecionados: []
};

let carrinho = [];
let impressoraOnline = null;
let pedidoAtual = null;
let promptInstalacao = null;
let filtroBusca = "";
let filtroCategoria = "todos";

// ============================
// ATALHOS DOM
// ============================
const $ = (id) => document.getElementById(id);

function setText(id, texto) {
    const el = $(id);
    if (el) el.textContent = texto;
}

// ============================
// UTILITÁRIOS
// ============================
function moeda(valor) {
    return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
}

function normalizar(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function resumirSabores(ids) {
    const contagem = {};
    ids.forEach((id) => { contagem[id] = (contagem[id] || 0) + 1; });
    return Object.entries(contagem).map(([id, qtd]) => {
        const sabor = sabores.find((s) => s.id === Number(id));
        const nome = sabor ? sabor.name : "Sabor";
        return qtd > 1 ? `${nome} (${qtd}x)` : nome;
    });
}

function totalCarrinho() {
    return carrinho.reduce((acc, item) => acc + item.preco * item.qtd, 0);
}

function totalComTaxa() {
    return totalCarrinho() + Number(CONFIG.taxaEntrega || 0);
}

function quantidadeItens() {
    return carrinho.reduce((acc, item) => acc + item.qtd, 0);
}

function imagemDoItem(item) {
    if (item.tipo === "salgado") {
        const salgado = salgados.find((s) => s.id === item.salgadoId);
        return salgado && salgado.image ? salgado.image : "";
    }
    const id = item.saboresIds && item.saboresIds[0];
    const sabor = sabores.find((s) => s.id === Number(id));
    return sabor ? sabor.image : "imagem/cardapio/pizza-padrao.jpg";
}

function toast(mensagem, acaoTexto, acao) {
    let el = $("toast");
    if (!el) {
        el = document.createElement("div");
        el.id = "toast";
        el.className = "toast";
        document.body.appendChild(el);
    }

    el.innerHTML = `<span>${mensagem}</span>`;
    if (acaoTexto && acao) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = acaoTexto;
        btn.addEventListener("click", () => {
            el.classList.remove("visivel");
            acao();
        });
        el.appendChild(btn);
    }

    el.classList.add("visivel");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("visivel"), 4500);
}

function esconderToast() {
    const el = $("toast");
    if (el) {
        el.classList.remove("visivel");
        clearTimeout(el._timer);
    }
}

function travarScroll(travar) {
    document.body.style.overflow = travar ? "hidden" : "";
}

function mascararTelefone(valor) {
    const d = String(valor || "").replace(/\D/g, "").slice(0, 11);
    if (d.length === 0) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function telefoneValido(valor) {
    const d = String(valor || "").replace(/\D/g, "");
    return d.length === 10 || d.length === 11;
}

// ============================
// RENDERIZAR DESTAQUES
// ============================
function renderDestaques() {
    const container = $("destaques-grid");
    if (!container) return;

    const lista = sabores.filter((s) => s.destaque);
    container.innerHTML = lista.map((s) => `
        <article class="destaque-card">
            <div class="destaque-media">
                <img src="${s.image}" alt="Pizza de ${s.name}" loading="lazy" width="800" height="600"
                     onerror="this.onerror=null;this.src='imagem/cardapio/pizza-padrao.jpg'">
                <span class="destaque-tag"><i class="fa-solid fa-fire"></i> Mais pedida</span>
            </div>
            <div class="destaque-body">
                <div class="destaque-top">
                    <h3>${s.name}</h3>
                    <span class="destaque-price"><small>a partir de</small>${moeda(30)}</span>
                </div>
                <p>${s.descricao}</p>
                <div class="destaque-foot">
                    <span class="tag-mini">${s.tags[0] || "Artesanal"}</span>
                    <button type="button" class="btn btn-gold btn-small" onclick="pedirDestaque(${s.id})">
                        Pedir <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </article>
    `).join("");
}

function pedirDestaque(id) {
    const sabor = sabores.find((s) => s.id === Number(id));
    if (!sabor) return;

    estado.tamanhoSelecionado = tamanhos[0];
    estado.saboresSelecionados = [sabor.id];
    filtroBusca = "";
    filtroCategoria = "todos";
    const busca = $("busca-sabores");
    if (busca) busca.value = "";
    sincronizarFiltrosCategoria();
    irParaPasso(2);
    toast(`${sabor.name} selecionada na pizza Média.`);
}

// ============================
// RENDERIZAR SALGADOS
// ============================
function renderSalgados() {
    const container = $("salgados-grid");
    if (!container) return;

    container.innerHTML = salgados.map((s) => {
        const midia = s.image
            ? `<img src="${s.image}" alt="${s.nome}" loading="lazy" onerror="this.onerror=null;this.style.display='none';this.parentElement.textContent='${s.emoji}'">`
            : s.emoji;
        return `
        <article class="salgado-card">
            <div class="salgado-media">${midia}</div>
            <div class="salgado-body">
                <div class="salgado-top">
                    <h3>${s.nome}</h3>
                    <span class="salgado-preco">${moeda(s.preco)}</span>
                </div>
                <p class="salgado-desc">${s.descricao}</p>
                <div class="salgado-foot">
                    <button type="button" class="btn btn-gold btn-small" onclick="adicionarSalgado('${s.id}')">
                        Adicionar <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>
        </article>`;
    }).join("");
}

function adicionarSalgado(id) {
    const salgado = salgados.find((s) => s.id === id);
    if (!salgado) return;

    const igual = carrinho.find((i) => i.tipo === "salgado" && i.salgadoId === salgado.id);
    if (igual) {
        igual.qtd += 1;
    } else {
        carrinho.push({
            tipo: "salgado",
            salgadoId: salgado.id,
            nome: salgado.nome,
            emoji: salgado.emoji,
            preco: salgado.preco,
            qtd: 1
        });
    }

    atualizarCartCount();
    toast(`${salgado.nome} adicionado ao pedido!`, "Ver pedido", abrirResumo);
}

// ============================
// RENDERIZAR TAMANHOS
// ============================
function renderTamanhos() {
    const container = $("size-cards");
    if (!container) return;

    container.innerHTML = tamanhos.map((t) => {
        const selecionado = Boolean(estado.tamanhoSelecionado && estado.tamanhoSelecionado.id === t.id);
        return `
        <article class="size-card ${selecionado ? "selected" : ""}"
                 onclick="selecionarTamanho('${t.id}')"
                 role="button" tabindex="0" aria-pressed="${selecionado}"
                 onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selecionarTamanho('${t.id}');}">
            <div class="size-top">
                <span class="size-badge ${t.destaque ? "hot" : ""}">${t.badge}</span>
                <span class="size-icon"><i class="fa-solid ${t.icone}"></i></span>
            </div>
            <h3 class="tamanho-nome">${t.label}</h3>
            <p class="size-desc">${t.descricao}</p>
            <div class="preco"><small>a partir de</small>${moeda(t.preco)}</div>
            <div class="size-meta">
                <span><i class="fa-solid fa-pizza-slice"></i> ${t.fatias} fatias</span>
                <span><i class="fa-solid fa-layer-group"></i> ${t.sabores} sabor${t.sabores > 1 ? "es" : ""}</span>
            </div>
            <span class="size-cta">
                ${selecionado ? '<i class="fa-solid fa-check"></i> Selecionado' : "Escolher este tamanho"}
            </span>
        </article>`;
    }).join("");
}

// ============================
// RENDERIZAR SABORES
// ============================
function renderSabores() {
    if (!estado.tamanhoSelecionado) return;

    const limite = estado.tamanhoSelecionado.sabores;
    const selecionados = estado.saboresSelecionados.length;
    const completo = selecionados >= limite;

    setText("sabores-contador", selecionados);
    setText("sabores-total", limite);

    const barra = $("progress-bar");
    if (barra) {
        barra.style.width = `${Math.min((selecionados / limite) * 100, 100)}%`;
    }

    const info = $("flavor-info");
    if (info) {
        info.textContent = completo
            ? "Pizza completa! Toque no número para remover um sabor ou adicione ao pedido."
            : `Toque nos sabores para montar sua pizza (faltam ${limite - selecionados}). Pode repetir o mesmo sabor.`;
    }

    const btnAdd = $("btn-adicionar-carrinho");
    if (btnAdd) btnAdd.classList.toggle("hidden", !completo);

    renderListaSabores();
}

function renderListaSabores() {
    const container = $("flavor-cards");
    if (!container) return;

    const termo = normalizar(filtroBusca);
    const filtrados = sabores.filter((s) => {
        const combinaCategoria = filtroCategoria === "todos" || s.categoria === filtroCategoria;
        if (!combinaCategoria) return false;
        if (!termo) return true;
        const alvo = normalizar(`${s.name} ${s.descricao} ${(s.tags || []).join(" ")}`);
        return alvo.includes(termo);
    });

    if (!filtrados.length) {
        container.innerHTML = `
            <div class="sem-resultados">
                <i class="fa-solid fa-magnifying-glass"></i>
                <strong>Nenhum sabor encontrado</strong>
                <p>Tente outro nome ou toque em "Todos" para ver o cardápio completo.</p>
            </div>`;
        return;
    }

    const contagem = {};
    estado.saboresSelecionados.forEach((id) => { contagem[id] = (contagem[id] || 0) + 1; });

    const porCategoria = {};
    filtrados.forEach((s) => {
        if (!porCategoria[s.categoria]) porCategoria[s.categoria] = [];
        porCategoria[s.categoria].push(s);
    });

    let html = "";
    Object.keys(NOMES_CATEGORIA).forEach((cat) => {
        if (!porCategoria[cat]) return;
        html += `
        <div class="categoria-sabores">
            <h3 class="titulo-categoria">${NOMES_CATEGORIA[cat]}</h3>
            <div class="flavor-grid">
                ${porCategoria[cat].map((s) => {
                    const qtd = contagem[s.id] || 0;
                    const selecionado = qtd > 0;
                    return `
                    <article class="flavor-card ${selecionado ? "selected" : ""}"
                             onclick="selecionarSabor(${s.id})"
                             role="button" tabindex="0" aria-pressed="${selecionado}"
                             aria-label="Selecionar sabor ${s.name}"
                             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selecionarSabor(${s.id});}">
                        <img src="${s.image}" alt="Pizza de ${s.name}" loading="lazy" width="800" height="600"
                             onerror="this.onerror=null;this.src='imagem/cardapio/pizza-padrao.jpg'">
                        ${selecionado ? `
                            <div class="check"><i class="fa-solid fa-check"></i></div>
                            <button type="button" class="qtd-badge"
                                    onclick="event.stopPropagation();removerSabor(${s.id})"
                                    title="Remover 1" aria-label="Remover 1 ${s.name}">${qtd}x</button>` : ""}
                        <div class="nome">${s.name}</div>
                        <p class="flavor-desc">${s.descricao}</p>
                        <div class="flavor-tags">
                            ${(s.tags || []).slice(0, 2).map((tag) => `<span class="flavor-tag">${tag}</span>`).join("")}
                        </div>
                    </article>`;
                }).join("")}
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

function filtrarSabores(valor) {
    filtroBusca = valor || "";
    renderListaSabores();
}

function filtrarCategoria(categoria, btn) {
    filtroCategoria = categoria || "todos";
    sincronizarFiltrosCategoria(btn);
    renderListaSabores();
}

function sincronizarFiltrosCategoria(btnAtivo) {
    const chips = document.querySelectorAll("#filtros-categoria .filtro-chip");
    chips.forEach((chip) => {
        const ativo = btnAtivo ? chip === btnAtivo : chip.dataset.cat === filtroCategoria;
        chip.classList.toggle("active", ativo);
    });
}

// ============================
// CARRINHO
// ============================
function adicionarAoCarrinho() {
    if (!estado.tamanhoSelecionado) return;

    const limite = estado.tamanhoSelecionado.sabores;
    if (estado.saboresSelecionados.length < limite) {
        toast(`Escolha mais ${limite - estado.saboresSelecionados.length} sabor${limite - estado.saboresSelecionados.length > 1 ? "es" : ""} para completar a pizza.`);
        return;
    }

    const listaSabores = resumirSabores(estado.saboresSelecionados);
    const item = {
        tamanho: estado.tamanhoSelecionado,
        saboresIds: [...estado.saboresSelecionados],
        sabores: listaSabores,
        preco: estado.tamanhoSelecionado.preco,
        qtd: 1
    };

    // Se for exatamente a mesma pizza, só aumenta a quantidade.
    const igual = carrinho.find((i) =>
        i.tamanho.id === item.tamanho.id &&
        i.saboresIds.slice().sort().join(",") === item.saboresIds.slice().sort().join(",")
    );

    if (igual) {
        igual.qtd += 1;
    } else {
        carrinho.push(item);
    }

    atualizarCartCount();
    estado.tamanhoSelecionado = null;
    estado.saboresSelecionados = [];
    filtroBusca = "";
    filtroCategoria = "todos";
    const busca = $("busca-sabores");
    if (busca) busca.value = "";
    sincronizarFiltrosCategoria();
    irParaPasso(1, false);

    toast(`${item.tamanho.label} adicionada ao pedido!`, "Finalizar", abrirResumo);
}

function abrirModalCarrinho() {
    const container = $("cart-items");
    const btnFinalizar = $("btn-ir-pagamento");
    const modal = $("cart-modal");

    if (!container) return;

    if (carrinho.length === 0) {
        container.innerHTML = `
            <div class="carrinho-vazio">
                <i class="fa-solid fa-bag-shopping"></i>
                Seu pedido está vazio.<br>Escolha um tamanho para começar.
            </div>`;
        if (btnFinalizar) btnFinalizar.disabled = true;
    } else {
        container.innerHTML = carrinho.map((item, index) => {
            const ehSalgado = item.tipo === "salgado";
            const imagem = imagemDoItem(item);
            const thumb = imagem
                ? `<img class="cart-item-thumb" src="${imagem}" alt="" loading="lazy"
                     onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex'">
                   <div class="cart-item-thumb cart-item-emoji" aria-hidden="true" style="display:none">${item.emoji || "🥟"}</div>`
                : `<div class="cart-item-thumb cart-item-emoji" aria-hidden="true">${item.emoji || "🥟"}</div>`;
            const titulo = ehSalgado
                ? item.nome
                : `${item.tamanho.label} • ${item.tamanho.fatias} fatias`;
            const detalhe = ehSalgado ? "Salgado" : item.sabores.join(", ");

            return `
            <div class="cart-item">
                ${thumb}
                <div class="cart-item-info">
                    <h4>${titulo}</h4>
                    <p>${detalhe}</p>
                    <p class="cart-item-preco">${moeda(item.preco * item.qtd)}</p>
                </div>
                <div class="cart-item-acoes">
                    <div class="qtd-controle">
                        <button type="button" onclick="alterarQuantidade(${index}, -1)" aria-label="Diminuir quantidade">−</button>
                        <span>${item.qtd}</span>
                        <button type="button" onclick="alterarQuantidade(${index}, 1)" aria-label="Aumentar quantidade">+</button>
                    </div>
                    <button type="button" class="btn-remover" onclick="removerDoCarrinho(${index})" aria-label="Remover item">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        }).join("");
        if (btnFinalizar) btnFinalizar.disabled = false;
    }

    atualizarTotaisCarrinho();

    if (modal) {
        modal.classList.remove("hidden");
        travarScroll(true);
    }
    esconderToast();
}

function fecharModalCarrinho(event) {
    if (event && event.target !== event.currentTarget) return;
    const modal = $("cart-modal");
    if (modal) modal.classList.add("hidden");
    travarScroll(false);
}

function alterarQuantidade(index, delta) {
    const item = carrinho[index];
    if (!item) return;

    item.qtd += delta;
    if (item.qtd <= 0) {
        carrinho.splice(index, 1);
    }

    atualizarCartCount();
    atualizarCarrinhoAberto();
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    atualizarCartCount();
    atualizarCarrinhoAberto();
}

function atualizarCarrinhoAberto() {
    const modal = $("cart-modal");
    if (modal && !modal.classList.contains("hidden")) {
        abrirModalCarrinho();
    } else {
        atualizarTotaisCarrinho();
    }
}

function atualizarTotaisCarrinho() {
    const subtotal = totalCarrinho();
    const taxa = Number(CONFIG.taxaEntrega || 0);
    const total = subtotal + taxa;
    const textoTaxa = taxa > 0 ? moeda(taxa) : "Grátis";

    setText("cart-subtotal", moeda(subtotal));
    setText("cart-taxa", textoTaxa);
    setText("cart-total-value", moeda(total));
    setText("resumo-subtotal", moeda(subtotal));
    setText("resumo-taxa", textoTaxa);
    setText("resumo-total", moeda(total));
    setText("mobile-cart-total", moeda(total));

    const itens = quantidadeItens();
    setText("mobile-cart-count", `${itens} ${itens === 1 ? "item" : "itens"}`);
}

function atualizarCartCount() {
    const el = $("cart-count");
    const total = quantidadeItens();

    if (el) {
        el.textContent = total;
        el.style.display = total === 0 ? "none" : "flex";
        el.classList.remove("pulse");
        void el.offsetWidth;
        el.classList.add("pulse");
    }

    const barra = $("mobile-cart-bar");
    const mostrarBarra = total > 0 && estado.passo !== 3;
    if (barra) barra.classList.toggle("hidden", !mostrarBarra);
    document.body.classList.toggle("carrinho-visivel", mostrarBarra);

    atualizarTotaisCarrinho();
}

// ============================
// NAVEGAÇÃO ENTRE ETAPAS
// ============================
function atualizarStepper(passo) {
    document.querySelectorAll("#stepper .stepper-item").forEach((item) => {
        const numero = Number(item.dataset.step);
        item.classList.toggle("active", numero === passo);
        item.classList.toggle("done", numero < passo);
    });
}

function irParaPasso(passo, rolar = true) {
    estado.passo = passo;

    ["step-size", "step-flavors", "step-payment"].forEach((id) => {
        const el = $(id);
        if (!el) return;
        el.classList.add("hidden");
        el.classList.remove("active");
    });

    const titulos = {
        1: "Escolha o tamanho",
        2: "Escolha os sabores",
        3: "Finalize seu pedido"
    };
    setText("page-title", titulos[passo] || titulos[1]);
    atualizarStepper(passo);

    let elAtivo = null;

    if (passo === 1) {
        elAtivo = $("step-size");
        renderTamanhos();
    } else if (passo === 2) {
        elAtivo = $("step-flavors");
        renderSabores();
    } else if (passo === 3) {
        elAtivo = $("step-payment");
        renderPagamento();
    }

    if (elAtivo) {
        elAtivo.classList.remove("hidden");
        elAtivo.classList.add("active");
    }

    atualizarCartCount();

    if (rolar) {
        const alvo = $("montar");
        if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function selecionarTamanho(id) {
    estado.tamanhoSelecionado = tamanhos.find((t) => t.id === id) || null;
    estado.saboresSelecionados = [];
    filtroBusca = "";
    filtroCategoria = "todos";
    const busca = $("busca-sabores");
    if (busca) busca.value = "";
    sincronizarFiltrosCategoria();
    irParaPasso(2);
}

function selecionarSabor(id) {
    if (!estado.tamanhoSelecionado) return;

    const limite = estado.tamanhoSelecionado.sabores;

    if (estado.saboresSelecionados.length < limite) {
        // Pode repetir o mesmo sabor (ex: 2x Calabresa).
        estado.saboresSelecionados.push(id);
    } else {
        toast(`Essa pizza aceita no máximo ${limite} sabor${limite > 1 ? "es" : ""}. Toque no número para remover.`);
        return;
    }

    renderSabores();
}

function removerSabor(id) {
    const pos = estado.saboresSelecionados.indexOf(id);
    if (pos === -1) return;
    estado.saboresSelecionados.splice(pos, 1);
    renderSabores();
}

function voltarTamanho() {
    estado.saboresSelecionados = [];
    irParaPasso(1);
}

function voltarAoCarrinho() {
    irParaPasso(1);
    abrirResumo();
}

function abrirResumo() {
    if (carrinho.length === 0) {
        toast("Seu pedido está vazio. Escolha uma pizza primeiro!");
        irParaPasso(1);
        return;
    }
    abrirModalCarrinho();
}

function irParaPagamento() {
    if (carrinho.length === 0) {
        toast("Adicione uma pizza antes de finalizar.");
        return;
    }

    fecharModalCarrinho();
    irParaPasso(3);
}

// ============================
// PAGAMENTO / RESUMO
// ============================
function selecionarPagamento(valor) {
    const hidden = $("payment-method");
    if (hidden) hidden.value = valor;

    document.querySelectorAll('input[name="forma-pagamento"]').forEach((radio) => {
        const card = radio.closest(".payment-card");
        const marcado = radio.value === valor;
        radio.checked = marcado;
        if (card) card.classList.toggle("selected", marcado);
    });

    atualizarTroco();
}

function atualizarPagamentoUI() {
    const hidden = $("payment-method");
    const valor = hidden ? hidden.value : "PIX";
    document.querySelectorAll('input[name="forma-pagamento"]').forEach((radio) => {
        const card = radio.closest(".payment-card");
        const marcado = radio.value === valor;
        radio.checked = marcado;
        if (card) card.classList.toggle("selected", marcado);
    });
}

function renderPagamento() {
    const container = $("resumo-itens");
    if (!container) return;

    container.innerHTML = carrinho.map((item) => `
        <div class="resumo-linha">
            <div>
                <span class="resumo-nome">${item.qtd}x ${item.tamanho.label} (${item.tamanho.fatias} fatias)</span>
                <span class="resumo-detalhe">${item.sabores.join(", ")}</span>
            </div>
            <span class="resumo-valor">${moeda(item.preco * item.qtd)}</span>
        </div>
    `).join("") || '<p class="carrinho-vazio">Nenhuma pizza no pedido.</p>';

    atualizarTotaisCarrinho();
    atualizarPagamentoUI();
    atualizarTroco();
    verificarImpressora();

    setText("tempo-entrega-texto", CONFIG.tempoEntrega);
}

function atualizarTroco() {
    const metodo = $("payment-method");
    const grupo = $("troco-group");
    if (metodo && grupo) {
        grupo.classList.toggle("hidden", metodo.value !== "Dinheiro");
    }
    alternarPix();
}

// ============================
// PIX (QR CODE COPIA E COLA)
// ============================
function alternarPix() {
    const metodo = $("payment-method");
    const box = $("pix-box");
    if (!metodo || !box) return;
    const ehPix = metodo.value === "PIX";
    box.classList.toggle("hidden", !ehPix);
    if (ehPix) renderPixBox();
}

function renderPixBox() {
    const total = totalComTaxa();
    const valorEl = $("pix-valor");
    const aviso = $("pix-aviso");
    const codigo = $("pix-copia-codigo");
    const qr = $("pix-qr");
    const conteudo = document.querySelector("#pix-box .pix-content");

    if (valorEl) valorEl.textContent = moeda(total);

    const pixOk = typeof window.PointRDPix !== "undefined" && window.PointRDPix.configurado();

    if (!pixOk) {
        if (codigo) codigo.textContent = "—";
        if (qr) qr.innerHTML = "";
        if (conteudo) conteudo.classList.add("hidden");
        if (aviso) aviso.classList.remove("hidden");
        return;
    }

    const payload = window.PointRDPix.montarParaLoja(total);
    if (conteudo) conteudo.classList.remove("hidden");
    if (codigo) codigo.textContent = payload;
    if (aviso) aviso.classList.add("hidden");
    if (qr) window.PointRDPix.renderizarQR(qr, payload);
}

function copiarPix() {
    const codigo = $("pix-copia-codigo");
    const texto = codigo ? codigo.textContent.trim() : "";

    if (!texto || texto === "—") {
        toast("A loja ainda não cadastrou a chave PIX.");
        return;
    }

    if (window.PointRDPix) {
        window.PointRDPix.copiar(texto).then((ok) => {
            toast(ok ? "Código PIX copiado!" : "Não foi possível copiar. Pressione e segure o código.");
        });
    }
}

// ============================
// IMPRESSORA
// ============================
async function verificarImpressora() {
    const statusEl = $("status-impressora");
    const btn = $("checkout-btn");
    const ajuda = $("checkout-ajuda");

    if (!CONFIG.impressaoAutomatica) {
        impressoraOnline = false;
        if (statusEl) {
            statusEl.className = "status-impressora offline";
            statusEl.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Pedido será enviado pelo WhatsApp.';
        }
        if (btn) btn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Enviar pedido';
        if (ajuda) ajuda.textContent = "Você será direcionado para o WhatsApp da loja.";
        return;
    }

    if (statusEl) {
        statusEl.className = "status-impressora";
        statusEl.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verificando impressora...';
    }

    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), 4000);

    try {
        const resp = await fetch(API_STATUS, { signal: controlador.signal, cache: "no-store" });
        if (!resp.ok) throw new Error("offline");
        const dados = await resp.json();

        impressoraOnline = Boolean(dados.impressora && dados.impressora.ok);

        if (statusEl) {
            if (impressoraOnline) {
                statusEl.className = "status-impressora online";
                statusEl.innerHTML = '<i class="fa-solid fa-print"></i> Impressora online — o pedido sai direto na cozinha.';
            } else {
                statusEl.className = "status-impressora offline";
                statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Impressora não configurada — enviaremos pelo WhatsApp.';
            }
        }

        if (btn) {
            btn.innerHTML = impressoraOnline
                ? '<i class="fa-solid fa-paper-plane"></i> Enviar pedido'
                : '<i class="fa-brands fa-whatsapp"></i> Enviar pedido';
        }
        if (ajuda) {
            ajuda.textContent = impressoraOnline
                ? "O pedido vai direto para a impressora da cozinha."
                : "A impressora está indisponível agora. O pedido será enviado pelo WhatsApp.";
        }
    } catch (erro) {
        impressoraOnline = false;
        if (statusEl) {
            statusEl.className = "status-impressora offline";
            statusEl.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Enviaremos seu pedido pelo WhatsApp.';
        }
        if (btn) btn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Enviar pedido';
        if (ajuda) ajuda.textContent = "Servidor de impressão indisponível. O pedido será enviado pelo WhatsApp.";
    } finally {
        clearTimeout(timeout);
    }
}

// ============================
// MONTAR PEDIDO
// ============================
function montarPedido() {
    const nome = ($("name-input")?.value || "").trim();
    const telefone = ($("phone-input")?.value || "").trim();
    const endereco = ($("address-input")?.value || "").trim();
    const pagamento = $("payment-method")?.value || "PIX";
    const troco = ($("troco-input")?.value || "").trim();
    const observacao = ($("obs-input")?.value || "").trim();

    return {
        nome,
        telefone,
        endereco,
        pagamento,
        troco: pagamento === "Dinheiro" ? troco : "",
        observacao,
        taxaEntrega: Number(CONFIG.taxaEntrega || 0),
        total: totalComTaxa(),
        itens: carrinho.map((item) => (
            item.tipo === "salgado"
                ? {
                    tipo: "salgado",
                    tamanho: item.nome,
                    fatias: 0,
                    sabores: [],
                    quantidade: item.qtd,
                    preco: item.preco
                }
                : {
                    tamanho: item.tamanho.label,
                    fatias: item.tamanho.fatias,
                    sabores: item.sabores,
                    quantidade: item.qtd,
                    preco: item.preco
                }
        )),
        origem: "site",
        criadoEm: new Date().toISOString()
    };
}

function marcarErro(inputId, warnId, erro) {
    const input = $(inputId);
    const warn = $(warnId);
    if (input) input.classList.toggle("erro", Boolean(erro));
    if (warn) warn.classList.toggle("hidden", !erro);
}

function validarPedido(pedido) {
    let ok = true;
    let primeiroErro = null;

    if (!pedido.nome) {
        ok = false;
        marcarErro("name-input", "name-warn", true);
        primeiroErro = primeiroErro || "name-input";
    } else {
        marcarErro("name-input", "name-warn", false);
    }

    if (!telefoneValido(pedido.telefone)) {
        ok = false;
        marcarErro("phone-input", "phone-warn", true);
        primeiroErro = primeiroErro || "phone-input";
    } else {
        marcarErro("phone-input", "phone-warn", false);
    }

    if (!pedido.endereco) {
        ok = false;
        marcarErro("address-input", "address-warn", true);
        primeiroErro = primeiroErro || "address-input";
    } else {
        marcarErro("address-input", "address-warn", false);
    }

    if (carrinho.length === 0) {
        ok = false;
        toast("Seu pedido está vazio.");
    }

    if (primeiroErro) $(primeiroErro)?.focus();

    return ok;
}

function mensagemWhatsapp(pedido) {
    let msg = `*NOVO PEDIDO - ${CONFIG.nomeLoja}*\n\n`;
    msg += `*Cliente:* ${pedido.nome}\n`;
    if (pedido.telefone) msg += `*Telefone:* ${pedido.telefone}\n`;
    msg += `\n*ITENS*\n`;

    pedido.itens.forEach((item) => {
        if (item.tipo === "salgado") {
            msg += `\n• *${item.quantidade}x ${item.tamanho}* (salgado)\n`;
        } else {
            msg += `\n• *${item.quantidade}x ${item.tamanho}* (${item.fatias} fatias)\n`;
            msg += `   Sabores: ${item.sabores.join(", ")}\n`;
        }
        msg += `   Valor: ${moeda(item.preco * item.quantidade)}\n`;
    });

    if (pedido.taxaEntrega > 0) msg += `\n*Taxa de entrega:* ${moeda(pedido.taxaEntrega)}\n`;
    msg += `\n*TOTAL:* ${moeda(pedido.total)}\n`;
    msg += `\n*Endereço:* ${pedido.endereco}\n`;
    msg += `*Pagamento:* ${pedido.pagamento}`;
    if (pedido.troco) msg += ` (troco para ${pedido.troco})`;
    if (pedido.observacao) msg += `\n*Obs:* ${pedido.observacao}`;

    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
}

async function enviarParaImpressora(pedido) {
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), 8000);

    try {
        const resp = await fetch(API_PEDIDOS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pedido),
            signal: controlador.signal
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function finalizarPedido() {
    const pedido = montarPedido();
    if (!validarPedido(pedido)) return;

    pedidoAtual = pedido;

    // Salva o pedido no Firestore (se o Firebase estiver configurado).
    // Não bloqueia o WhatsApp: se falhar, o pedido chega pela mensagem mesmo assim.
    const salvamento = window.PointRDFirebase
        ? window.PointRDFirebase.salvarPedido(pedido)
        : null;

    // Sem impressora: abre o WhatsApp na hora (mesmo clique, sem bloqueio de pop-up).
    if (!CONFIG.impressaoAutomatica) {
        const abriu = abrirWhatsapp(pedido);
        mostrarSucesso(null, { whatsappAberto: abriu });

        if (salvamento && typeof salvamento.then === "function") {
            salvamento.then((resultado) => {
                if (resultado && resultado.numero) atualizarNumeroSucesso(resultado.numero);
            }).catch(() => {});
        }
        return;
    }

    const btn = $("checkout-btn");
    const textoOriginal = btn ? btn.innerHTML : "";
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Enviando...';
    }

    try {
        const resultado = await enviarParaImpressora(pedido);
        pedidoAtual = Object.assign({}, pedido, resultado);
        mostrarSucesso(resultado);
    } catch (erro) {
        console.warn("Impressão indisponível, usando WhatsApp:", erro.message);
        mostrarSucesso(null);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = textoOriginal;
        }
    }
}

function abrirWhatsapp(pedido) {
    const link = mensagemWhatsapp(pedido);
    try {
        // noopener/noreferrer impede que a página aberta controle esta aba.
        window.open(link, "_blank", "noopener,noreferrer");
        return true;
    } catch (erro) {
        return false;
    }
}

function atualizarNumeroSucesso(numero) {
    const el = $("success-numero");
    if (el) el.textContent = `Pedido nº ${numero}`;
}

function mostrarSucesso(resultado, opcoes = {}) {
    const modal = $("success-modal");
    const titulo = $("success-title");
    const texto = $("success-text");
    const numero = $("success-numero");
    const link = $("success-whatsapp");

    const linkWhats = mensagemWhatsapp(pedidoAtual || { itens: [], total: 0, nome: "", endereco: "", pagamento: "" });
    if (link) link.href = linkWhats;

    if (resultado && resultado.pedido) {
        if (titulo) titulo.textContent = "Pedido enviado!";
        if (texto) texto.textContent = `Já está na cozinha. Previsão de entrega: ${CONFIG.tempoEntrega}.`;
        if (numero) numero.textContent = `Pedido nº ${resultado.pedido.numero}`;
    } else if (opcoes.whatsappAberto) {
        if (titulo) titulo.textContent = "Pedido aberto no WhatsApp";
        if (texto) texto.textContent = "Confira a mensagem e toque em enviar. Se o WhatsApp não abriu, use o botão abaixo.";
        if (numero) numero.textContent = "";
    } else {
        if (titulo) titulo.textContent = "Confirme no WhatsApp";
        if (texto) texto.textContent = "A impressora não respondeu. Toque no botão abaixo para enviar o pedido pelo WhatsApp da loja.";
        if (numero) numero.textContent = "";
    }

    carrinho = [];
    atualizarCartCount();
    limparFormulario();
    irParaPasso(1, false);

    if (modal) {
        modal.classList.remove("hidden");
        travarScroll(true);
    }
    esconderToast();
}

function fecharSucesso(event) {
    if (event && event.target !== event.currentTarget) return;
    const modal = $("success-modal");
    if (modal) modal.classList.add("hidden");
    travarScroll(false);
}

function limparFormulario() {
    ["name-input", "phone-input", "address-input", "obs-input", "troco-input"].forEach((id) => {
        const el = $(id);
        if (el) el.value = "";
    });
    ["name-input", "phone-input", "address-input"].forEach((id) => {
        const el = $(id);
        if (el) el.classList.remove("erro");
    });
    ["name-warn", "phone-warn", "address-warn"].forEach((id) => {
        $(id)?.classList.add("hidden");
    });
    selecionarPagamento("PIX");
}

function novoPedido() {
    fecharSucesso();
    irParaPasso(1);
}

// ============================
// PWA / INSTALAÇÃO
// ============================
function registrarServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol === "file:") return;

    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").then((registro) => {
            registro.update().catch(() => {});
        }).catch((erro) => {
            console.warn("Service worker não registrado:", erro);
        });
    });
}

function configurarInstalacao() {
    const banner = $("install-banner");
    const hint = $("install-hint");
    if (!banner) return;

    const jaFechou = localStorage.getItem("point-rd-install-fechado") === "1";
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

    if (jaFechou || standalone) return;

    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        promptInstalacao = event;
        banner.classList.remove("hidden");
    });

    window.addEventListener("appinstalled", () => {
        banner.classList.add("hidden");
        promptInstalacao = null;
        localStorage.setItem("point-rd-install-fechado", "1");
    });

    // iPhone (Safari) não dispara beforeinstallprompt
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
        if (hint) hint.textContent = "Toque em Compartilhar → Adicionar à Tela de Início.";
        banner.classList.remove("hidden");
    }
}

function instalarApp() {
    if (promptInstalacao) {
        promptInstalacao.prompt();
        promptInstalacao.userChoice.then(() => {
            promptInstalacao = null;
            $("install-banner")?.classList.add("hidden");
        });
        return;
    }

    toast("No iPhone: Compartilhar → Adicionar à Tela de Início. No Android: menu ⋮ → Instalar app.");
}

function fecharBannerInstalacao() {
    $("install-banner")?.classList.add("hidden");
    localStorage.setItem("point-rd-install-fechado", "1");
}

function avisoWhatsapp() {
    const dentroDoWhatsapp = /WhatsApp/i.test(navigator.userAgent);
    if (!dentroDoWhatsapp) return;
    $("aviso-whatsapp")?.classList.remove("hidden");
}

function fecharAvisoWhatsapp() {
    $("aviso-whatsapp")?.classList.add("hidden");
}

// ============================
// MENU MOBILE
// ============================
function alternarMenu() {
    const nav = $("main-nav");
    const btn = $("menu-toggle");
    if (!nav) return;
    const aberto = nav.classList.toggle("open");
    if (btn) btn.setAttribute("aria-expanded", String(aberto));
}

function fecharMenu() {
    const nav = $("main-nav");
    const btn = $("menu-toggle");
    if (nav) nav.classList.remove("open");
    if (btn) btn.setAttribute("aria-expanded", "false");
}

// ============================
// CONFIG / LOJA
// ============================
function aplicarConfigLoja() {
    document.querySelectorAll("[data-wa]").forEach((el) => {
        el.href = `https://wa.me/${CONFIG.whatsapp}`;
    });
    setText("tempo-entrega-texto", CONFIG.tempoEntrega);
}

// ============================
// EVENTOS GERAIS
// ============================
function initElements() {
    const cartBtn = $("cart-btn");
    if (cartBtn) {
        cartBtn.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                abrirResumo();
            }
        });
    }

    const phone = $("phone-input");
    if (phone) {
        phone.addEventListener("input", () => {
            phone.value = mascararTelefone(phone.value);
            if (telefoneValido(phone.value)) {
                marcarErro("phone-input", "phone-warn", false);
            }
        });
    }

    const limparWarn = (inputId, warnId) => {
        const input = $(inputId);
        if (!input) return;
        input.addEventListener("input", () => {
            if (input.value.trim()) marcarErro(inputId, warnId, false);
        });
    };
    limparWarn("name-input", "name-warn");
    limparWarn("address-input", "address-warn");

    const header = document.querySelector(".site-header");
    if (header) {
        const aoRolar = () => header.classList.toggle("scrolled", window.scrollY > 12);
        aoRolar();
        window.addEventListener("scroll", aoRolar, { passive: true });
    }

    // Animação de entrada das seções
    const reveals = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && reveals.length) {
        const observador = new IntersectionObserver((entradas) => {
            entradas.forEach((entrada) => {
                if (entrada.isIntersecting) {
                    entrada.target.classList.add("in-view");
                    observador.unobserve(entrada.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
        reveals.forEach((el) => observador.observe(el));
    } else {
        reveals.forEach((el) => el.classList.add("in-view"));
    }
}

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    fecharModalCarrinho();
    fecharSucesso();
    fecharMenu();
});

// ============================
// INICIALIZAR
// ============================
window.addEventListener("DOMContentLoaded", () => {
    aplicarConfigLoja();
    initElements();
    renderDestaques();
    renderSalgados();
    atualizarPagamentoUI();
    irParaPasso(1, false);
    atualizarCartCount();
    atualizarTroco();
    registrarServiceWorker();
    configurarInstalacao();
    avisoWhatsapp();
});

// Expor funções para os onclick do HTML
Object.assign(window, {
    selecionarTamanho,
    selecionarSabor,
    removerSabor,
    voltarTamanho,
    voltarAoCarrinho,
    abrirResumo,
    abrirModalCarrinho,
    fecharModalCarrinho,
    alterarQuantidade,
    removerDoCarrinho,
    irParaPagamento,
    adicionarAoCarrinho,
    atualizarTroco,
    alternarPix,
    copiarPix,
    finalizarPedido,
    fecharSucesso,
    novoPedido,
    instalarApp,
    fecharBannerInstalacao,
    fecharAvisoWhatsapp,
    filtrarSabores,
    filtrarCategoria,
    selecionarPagamento,
    pedirDestaque,
    adicionarSalgado,
    irParaPasso,
    alternarMenu,
    fecharMenu
});
