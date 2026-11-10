/* ============================================================
   Cupom de pedido - Point do RD
   Monta o texto do cupom e converte para ESC/POS (impressora
   térmica de 58mm ou 80mm).
   ============================================================ */

function moeda(valor) {
    return "R$ " + Number(valor || 0).toFixed(2).replace(".", ",");
}

function dataHora(iso) {
    const d = iso ? new Date(iso) : new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function alinhar(texto, largura, align) {
    const t = String(texto);
    if (align === "center") {
        const espaco = Math.max(0, Math.floor((largura - t.length) / 2));
        return " ".repeat(espaco) + t;
    }
    if (align === "right") {
        return " ".repeat(Math.max(0, largura - t.length)) + t;
    }
    return t;
}

function quebrar(texto, largura) {
    const palavras = String(texto).split(/\s+/);
    const linhas = [];
    let atual = "";
    for (const palavra of palavras) {
        if (!atual.length) {
            atual = palavra;
        } else if ((atual + " " + palavra).length <= largura) {
            atual += " " + palavra;
        } else {
            linhas.push(atual);
            atual = palavra;
        }
    }
    if (atual.length) linhas.push(atual);
    return linhas.length ? linhas : [""];
}

/**
 * Gera a lista de blocos do cupom.
 * Cada bloco: { texto, align, bold, big, sep }
 */
function criarCupom(pedido, cfg = {}) {
    const largura = cfg.largura || 48;
    const nomeLoja = (cfg.nomeLoja || "POINT DO RD").toUpperCase();
    const telefone = cfg.telefone || "";
    const blocos = [];

    const add = (texto, opcoes = {}) => {
        blocos.push({
            texto: String(texto),
            align: opcoes.align || "left",
            bold: Boolean(opcoes.bold),
            big: Boolean(opcoes.big)
        });
    };

    add(nomeLoja, { align: "center", bold: true, big: true });
    add("Delivery de Pizzas", { align: "center" });
    if (telefone) add(telefone, { align: "center" });
    add("=".repeat(largura));
    add(`PEDIDO #${String(pedido.numero || 0).padStart(4, "0")}`, { bold: true, big: true });
    add(dataHora(pedido.criadoEm));
    add("-".repeat(largura));

    add(`CLIENTE: ${pedido.nome || "-"}`, { bold: true });
    if (pedido.telefone) add(`FONE: ${pedido.telefone}`);
    add("ENDERECO:");
    quebrar(pedido.endereco || "-", largura).forEach((l) => add(l, { bold: true }));
    if (pedido.referencia) add(`REF: ${pedido.referencia}`);
    add("-".repeat(largura));

    add("ITENS", { bold: true });
    (pedido.itens || []).forEach((item) => {
        add(`${item.quantidade}x ${item.tamanho} (${item.fatias} fatias)`, { bold: true });
        quebrar(`   Sabores: ${(item.sabores || []).join(", ")}`, largura).forEach((l) => add(l));
        add(alinhar(`   ${moeda(item.preco * item.quantidade)}`, largura, "right"));
    });

    add("-".repeat(largura));
    if (Number(pedido.taxaEntrega) > 0) {
        add(alinhar(`Taxa de entrega${" ".repeat(2)}${moeda(pedido.taxaEntrega)}`, largura, "right"));
    }
    add(alinhar(`TOTAL: ${moeda(pedido.total)}`, largura, "right"), { bold: true, big: true });
    add("-".repeat(largura));

    add(`PAGAMENTO: ${pedido.pagamento || "-"}`, { bold: true });
    if (pedido.troco) add(`TROCO PARA: ${pedido.troco}`);
    if (pedido.observacao) {
        add("OBSERVACAO:", { bold: true });
        quebrar(pedido.observacao, largura).forEach((l) => add(l));
    }

    add("=".repeat(largura));
    add("Obrigado pela preferencia!", { align: "center", bold: true });
    add("Volte sempre!", { align: "center" });
    add("");

    return { blocos, largura };
}

/** Texto puro (para impressora via driver do Windows ou arquivo .txt) */
function renderTexto(cupom) {
    const { blocos, largura } = cupom;
    return blocos
        .map((b) => {
            const texto = b.big ? b.texto.toUpperCase() : b.texto;
            if (b.align === "center" && texto.length <= largura) {
                return alinhar(texto, largura, "center");
            }
            return texto;
        })
        .join("\r\n");
}

/* ---------------- ESC/POS ---------------- */

const MAPA_CP850 = {
    "Ç": 0x80, "ü": 0x81, "é": 0x82, "â": 0x83, "ä": 0x84, "à": 0x85, "å": 0x86, "ç": 0x87,
    "ê": 0x88, "ë": 0x89, "è": 0x8A, "ï": 0x8B, "î": 0x8C, "ì": 0x8D, "Ä": 0x8E, "Å": 0x8F,
    "É": 0x90, "æ": 0x91, "Æ": 0x92, "ô": 0x93, "ö": 0x94, "ò": 0x95, "û": 0x96, "ù": 0x97,
    "ÿ": 0x98, "Ö": 0x99, "Ü": 0x9A, "ø": 0x9B, "£": 0x9C, "Ø": 0x9D, "×": 0x9E, "ƒ": 0x9F,
    "á": 0xA0, "í": 0xA1, "ó": 0xA2, "ú": 0xA3, "ñ": 0xA4, "Ñ": 0xA5, "ª": 0xA6, "º": 0xA7,
    "¿": 0xA8, "®": 0xA9, "¬": 0xAA, "½": 0xAB, "¼": 0xAC, "¡": 0xAD, "«": 0xAE, "»": 0xAF,
    "Á": 0xB5, "Â": 0xB6, "À": 0xB7, "©": 0xB8, "¢": 0xBD, "¥": 0xBE,
    "ã": 0xC6, "Ã": 0xC7,
    "Ê": 0xD2, "Ë": 0xD3, "È": 0xD4, "Í": 0xD6, "Î": 0xD7, "Ï": 0xD8,
    "Ó": 0xE0, "ß": 0xE1, "Ô": 0xE2, "Ò": 0xE3, "õ": 0xE4, "Õ": 0xE5, "µ": 0xE6,
    "Ú": 0xE9, "Û": 0xEA, "Ù": 0xEB, "ý": 0xEC, "Ý": 0xED, "°": 0xF8
};

function paraCp850(texto) {
    const bytes = [];
    for (const ch of String(texto)) {
        if (Object.prototype.hasOwnProperty.call(MAPA_CP850, ch)) {
            bytes.push(MAPA_CP850[ch]);
        } else {
            const codigo = ch.codePointAt(0);
            bytes.push(codigo <= 0x7F ? codigo : 0x3F); // "?" para o que não existir
        }
    }
    return Buffer.from(bytes);
}

const ESC = 0x1B;
const GS = 0x1D;

function comando(...bytes) {
    return Buffer.from(bytes);
}

/** Gera o buffer ESC/POS pronto para enviar na térmica. */
function renderEscPos(cupom, cfg = {}) {
    const { blocos } = cupom;
    const partes = [];

    partes.push(comando(ESC, 0x40)); // inicializa
    partes.push(comando(ESC, 0x74, 0x02)); // tabela de caracteres PC850

    blocos.forEach((b) => {
        // alinhamento
        const align = b.align === "center" ? 1 : b.align === "right" ? 2 : 0;
        partes.push(comando(ESC, 0x61, align));
        // negrito
        partes.push(comando(ESC, 0x45, b.bold ? 1 : 0));
        // tamanho
        partes.push(comando(GS, 0x21, b.big ? 0x11 : 0x00));
        partes.push(paraCp850(b.texto));
        partes.push(comando(0x0A));
    });

    partes.push(comando(ESC, 0x45, 0x00));
    partes.push(comando(GS, 0x21, 0x00));
    partes.push(comando(ESC, 0x64, 0x03)); // avança 3 linhas

    if (cfg.cortarPapel !== false) {
        partes.push(comando(GS, 0x56, 0x01)); // corte parcial
    }
    if (cfg.abrirGaveta) {
        partes.push(comando(ESC, 0x70, 0x00, 0x19, 0xFA));
    }

    return Buffer.concat(partes);
}

module.exports = {
    criarCupom,
    renderTexto,
    renderEscPos,
    moeda,
    dataHora,
    quebrar,
    alinhar
};
