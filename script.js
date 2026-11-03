// ============================
// DADOS - Point do RD
// ============================
const tamanhos = [
    { id: 'media', label: 'Média', sabores: 1, preco: 30.00, fatias: 6 },
    { id: 'grande', label: 'Grande', sabores: 2, preco: 40.00, fatias: 8 },
    { id: 'familia', label: 'Família', sabores: 3, preco: 50.00, fatias: 12 }
];

const sabores = [
    // === TRADICIONAIS ===
    { id: 1, name: "Calabresa", categoria: "tradicional", image: "imagem/cardapio/calabresa.jpg" },
    { id: 2, name: "Mista", categoria: "tradicional", image: "imagem/cardapio/mista.jpg" },
    { id: 3, name: "Mussarela", categoria: "tradicional", image: "imagem/cardapio/mussarela.jpg" },
    { id: 4, name: "Portuguesa", categoria: "tradicional", image: "imagem/cardapio/portuguesa.jpg" },
    { id: 5, name: "Três Queijos", categoria: "tradicional", image: "imagem/cardapio/tres-queijos.jpg" },
    { id: 6, name: "Frango com Catupiry", categoria: "tradicional", image: "imagem/cardapio/frango com catupiry.jfif" },
    { id: 7, name: "Atum", categoria: "tradicional", image: "imagem/cardapio/atum.jpg" },
    { id: 8, name: "Bacon", categoria: "tradicional", image: "imagem/cardapio/bacon.jpg" },

    // === DOCES ===
    { id: 12, name: "Romeu e Julieta", categoria: "doce", image: "imagem/cardapio/romeu-e-julieta.jpg" },
    { id: 13, name: "Brigadeiro", categoria: "doce", image: "imagem/cardapio/brigadeiro.jpg" },
    { id: 14, name: "Doce de Leite", categoria: "doce", image: "imagem/cardapio/doce-de-leite.jpg" }

    // === ESPECIAIS ===
    // Para adicionar um sabor especial, copie uma linha acima e use:
    // { id: 20, name: "Nome do Sabor", categoria: "especial", image: "imagem/cardapio/arquivo.jpg" }
];

const NOMES_CATEGORIA = {
    tradicional: '🍕 Tradicionais',
    doce: '🍫 Doces',
    especial: '👑 Especiais'
};

// ============================
// CONFIGURAÇÕES
// ============================
const CONFIG = Object.assign({
    api: "",
    whatsapp: "5571988580935",
    taxaEntrega: 0,
    tempoEntrega: "40 a 60 minutos",
    impressaoAutomatica: true,
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

// ============================
// ATALHOS DOM
// ============================
const $ = (id) => document.getElementById(id);

function initElements() {
    // Atalho de teclado para abrir o carrinho
    const cartBtn = $("cart-btn");
    if (cartBtn) {
        cartBtn.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                abrirResumo();
            }
        });
    }
}

// ============================
// UTILITÁRIOS
// ============================
function moeda(valor) {
    return `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;
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

// ============================
// RENDERIZAR TAMANHOS
// ============================
function renderTamanhos() {
    const container = $("size-cards");
    if (!container) return;

    container.innerHTML = tamanhos.map((t) => `
        <div class="size-card ${estado.tamanhoSelecionado && estado.tamanhoSelecionado.id === t.id ? 'selected' : ''}"
             onclick="selecionarTamanho('${t.id}')"
             role="button" tabindex="0"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selecionarTamanho('${t.id}');}">
            <div class="tamanho-nome">${t.label}</div>
            <div class="preco">${moeda(t.preco)}</div>
            <div class="sabores">${t.fatias} fatias • ${t.sabores} sabor${t.sabores > 1 ? 'es' : ''}</div>
        </div>
    `).join('');
}

// ============================
// RENDERIZAR SABORES
// ============================
function renderSabores() {
    if (!estado.tamanhoSelecionado) return;

    const limite = estado.tamanhoSelecionado.sabores;
    const contador = $("sabores-contador");
    const totalEl = $("sabores-total");
    const barra = $("progress-bar");
    const info = $("flavor-info");
    const btnAdd = $("btn-adicionar-carrinho");

    if (contador) contador.textContent = estado.saboresSelecionados.length;
    if (totalEl) totalEl.textContent = limite;

    if (barra) {
        const percentual = Math.min((estado.saboresSelecionados.length / limite) * 100, 100);
        barra.style.width = `${percentual}%`;
    }

    if (info) {
        info.textContent = estado.saboresSelecionados.length >= limite
            ? "Pizza completa! Toque no número para remover um sabor ou adicione ao carrinho."
            : `Toque nos sabores para montar sua pizza (faltam ${limite - estado.saboresSelecionados.length}). Pode repetir o mesmo sabor.`;
    }

    const completo = estado.saboresSelecionados.length >= limite;
    if (btnAdd) btnAdd.classList.toggle("hidden", !completo);

    const contagem = {};
    estado.saboresSelecionados.forEach((id) => { contagem[id] = (contagem[id] || 0) + 1; });

    const container = $("flavor-cards");
    if (!container) return;

    // Agrupar sabores por categoria
    const porCategoria = {};
    sabores.forEach((s) => {
        if (!porCategoria[s.categoria]) porCategoria[s.categoria] = [];
        porCategoria[s.categoria].push(s);
    });

    let html = '';
    Object.keys(porCategoria).forEach((cat) => {
        html += `<div class="categoria-sabores">
            <h3 class="titulo-categoria">${NOMES_CATEGORIA[cat] || cat}</h3>
            <div class="flavor-grid">
                ${porCategoria[cat].map((s) => {
                    const qtd = contagem[s.id] || 0;
                    const selecionado = qtd > 0;
                    return `
                        <div class="flavor-card ${selecionado ? 'selected' : ''}"
                             onclick="selecionarSabor(${s.id})"
                             role="button" tabindex="0"
                             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selecionarSabor(${s.id});}">
                            <img src="${s.image}" alt="Pizza de ${s.name}" loading="lazy"
                                 onerror="this.onerror=null;this.src='imagem/cardapio/pizza-padrao.jpg'">
                            <div class="nome">${s.name}</div>
                            ${selecionado ? `<div class="check">✓</div>
                            <button type="button" class="qtd-badge"
                                    onclick="event.stopPropagation();removerSabor(${s.id})"
                                    title="Remover 1" aria-label="Remover 1 ${s.name}">${qtd}x</button>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

// ============================
// CARRINHO
// ============================
function adicionarAoCarrinho() {
    if (!estado.tamanhoSelecionado || estado.saboresSelecionados.length === 0) return;

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
        i.saboresIds.slice().sort().join(',') === item.saboresIds.slice().sort().join(',')
    );

    if (igual) {
        igual.qtd += 1;
    } else {
        carrinho.push(item);
    }

    atualizarCartCount();
    estado.tamanhoSelecionado = null;
    estado.saboresSelecionados = [];
    irParaPasso(1);

    toast(`${item.tamanho.label} adicionada ao pedido!`, "Finalizar", abrirResumo);
}

function abrirModalCarrinho() {
    const container = $("cart-items");
    const totalEl = $("cart-total-value");
    const btnFinalizar = $("btn-ir-pagamento");
    const modal = $("cart-modal");

    if (!container) return;

    if (carrinho.length === 0) {
        container.innerHTML = '<p class="carrinho-vazio">Seu carrinho está vazio 🍕<br>Escolha um tamanho para começar.</p>';
        if (totalEl) totalEl.textContent = moeda(0);
        if (btnFinalizar) btnFinalizar.disabled = true;
    } else {
        container.innerHTML = carrinho.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.tamanho.label} • ${item.tamanho.fatias} fatias</h4>
                    <p>${item.sabores.join(', ')}</p>
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
        `).join('');

        if (totalEl) totalEl.textContent = moeda(totalCarrinho());
        if (btnFinalizar) btnFinalizar.disabled = false;
    }

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
    abrirModalCarrinho();
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    atualizarCartCount();
    abrirModalCarrinho();
}

function atualizarCartCount() {
    const el = $("cart-count");
    const total = quantidadeItens();
    if (!el) return;
    el.textContent = total;
    el.style.display = total === 0 ? "none" : "flex";
    el.classList.remove("pulse");
    void el.offsetWidth;
    el.classList.add("pulse");
}

// ============================
// NAVEGAÇÃO ENTRE ETAPAS
// ============================
function irParaPasso(passo) {
    estado.passo = passo;

    ["step-size", "step-flavors", "step-payment"].forEach((id) => {
        const el = $(id);
        if (!el) return;
        el.classList.add("hidden");
        el.classList.remove("active");
    });

    const cartBtn = $("cart-btn");
    if (cartBtn) cartBtn.style.display = passo === 3 ? "none" : "flex";

    const titulo = $("page-title");
    let elAtivo = null;

    if (passo === 1) {
        elAtivo = $("step-size");
        if (titulo) titulo.textContent = "Escolha o Tamanho";
        renderTamanhos();
    } else if (passo === 2) {
        elAtivo = $("step-flavors");
        if (titulo) titulo.textContent = "Escolha os Sabores";
        renderSabores();
    } else if (passo === 3) {
        elAtivo = $("step-payment");
        if (titulo) titulo.textContent = "Pagamento";
        renderPagamento();
    }

    if (elAtivo) {
        elAtivo.classList.remove("hidden");
        elAtivo.classList.add("active");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function selecionarTamanho(id) {
    estado.tamanhoSelecionado = tamanhos.find((t) => t.id === id) || null;
    estado.saboresSelecionados = [];
    irParaPasso(2);
}

function selecionarSabor(id) {
    if (!estado.tamanhoSelecionado) return;

    const limite = estado.tamanhoSelecionado.sabores;

    if (estado.saboresSelecionados.length < limite) {
        // Pode repetir o mesmo sabor (ex: 2x Calabresa).
        estado.saboresSelecionados.push(id);
    } else {
        toast(`Essa pizza aceita no máximo ${limite} sabor${limite > 1 ? 'es' : ''}. Toque no número para remover.`);
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
function renderPagamento() {
    const container = $("resumo-itens");
    const totalEl = $("resumo-total");
    if (!container) return;

    container.innerHTML = carrinho.map((item) => `
        <div class="resumo-linha">
            <div>
                <span class="resumo-nome">${item.qtd}x ${item.tamanho.label} (${item.tamanho.fatias} fatias)</span>
                <span class="resumo-detalhe">${item.sabores.join(', ')}</span>
            </div>
            <span class="resumo-valor">${moeda(item.preco * item.qtd)}</span>
        </div>
    `).join('') || '<p class="carrinho-vazio">Nenhuma pizza no pedido.</p>';

    if (Number(CONFIG.taxaEntrega) > 0) {
        container.innerHTML += `
            <div class="resumo-linha">
                <div><span class="resumo-nome">Taxa de entrega</span></div>
                <span class="resumo-valor">${moeda(CONFIG.taxaEntrega)}</span>
            </div>`;
    }

    if (totalEl) totalEl.textContent = moeda(totalComTaxa());

    atualizarTroco();
    verificarImpressora();
}

function atualizarTroco() {
    const metodo = $("payment-method");
    const grupo = $("troco-group");
    if (!metodo || !grupo) return;
    grupo.classList.toggle("hidden", metodo.value !== "Dinheiro");
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
        if (btn) btn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Enviar no WhatsApp';
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
                ? '<i class="fa-solid fa-paper-plane"></i> Enviar Pedido'
                : '<i class="fa-brands fa-whatsapp"></i> Enviar no WhatsApp';
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
        if (btn) btn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Enviar no WhatsApp';
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
        itens: carrinho.map((item) => ({
            tamanho: item.tamanho.label,
            fatias: item.tamanho.fatias,
            sabores: item.sabores,
            quantidade: item.qtd,
            preco: item.preco
        })),
        origem: "site",
        criadoEm: new Date().toISOString()
    };
}

function validarPedido(pedido) {
    const nomeWarn = $("name-warn");
    const addressWarn = $("address-warn");

    let ok = true;

    if (!pedido.nome) {
        ok = false;
        if (nomeWarn) nomeWarn.classList.remove("hidden");
        $("name-input")?.focus();
    } else if (nomeWarn) {
        nomeWarn.classList.add("hidden");
    }

    if (!pedido.endereco) {
        ok = false;
        if (addressWarn) addressWarn.classList.remove("hidden");
        if (pedido.nome) $("address-input")?.focus();
    } else if (addressWarn) {
        addressWarn.classList.add("hidden");
    }

    if (carrinho.length === 0) {
        ok = false;
        toast("Seu pedido está vazio.");
    }

    return ok;
}

function mensagemWhatsapp(pedido) {
    let msg = `*NOVO PEDIDO - ${CONFIG.nomeLoja}*\n\n`;
    msg += `*Cliente:* ${pedido.nome}\n`;
    if (pedido.telefone) msg += `*Telefone:* ${pedido.telefone}\n`;
    msg += `\n*ITENS*\n`;

    pedido.itens.forEach((item) => {
        msg += `\n• *${item.quantidade}x ${item.tamanho}* (${item.fatias} fatias)\n`;
        msg += `   Sabores: ${item.sabores.join(', ')}\n`;
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
    if (window.PointRDFirebase) {
        window.PointRDFirebase.salvarPedido(pedido);
    }

    // Sem impressora: abre o WhatsApp na hora (mesmo clique, sem bloqueio de pop-up).
    if (!CONFIG.impressaoAutomatica) {
        abrirWhatsapp(pedido);
        mostrarSucesso(null, { whatsappAberto: true });
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
        const janela = window.open(link, "_blank");
        return Boolean(janela);
    } catch (erro) {
        return false;
    }
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
    irParaPasso(1);

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
    ["address-input", "obs-input", "troco-input"].forEach((id) => {
        const el = $(id);
        if (el) el.value = "";
    });
    const pagamento = $("payment-method");
    if (pagamento) pagamento.value = "PIX";
    atualizarTroco();
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
        navigator.serviceWorker.register("sw.js").catch((erro) => {
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
// EVENTOS GERAIS
// ============================
document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    fecharModalCarrinho();
    fecharSucesso();
});

// ============================
// INICIALIZAR
// ============================
window.addEventListener("DOMContentLoaded", () => {
    initElements();
    irParaPasso(1);
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
    finalizarPedido,
    fecharSucesso,
    novoPedido,
    instalarApp,
    fecharBannerInstalacao,
    fecharAvisoWhatsapp
});
