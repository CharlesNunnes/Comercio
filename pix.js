/* ============================================================
   PIX - Point do RD
   Gera o "PIX Copia e Cola" (BR Code / EMV) com o total do
   pedido. Funciona 100% local, sem API externa.
   ------------------------------------------------------------
   A loja precisa configurar a chave PIX em config.js:
     pixChave: "sua chave (CPF/CNPJ, e-mail, telefone ou aleatória)",
     pixNome: "POINT DO RD",
     pixCidade: "SALVADOR"
   ============================================================ */

(function (root) {
    "use strict";

    /** Remove acentos/caracteres especiais (o BR Code só aceita ASCII simples). */
    function sanitizar(texto, maximo) {
        const limpo = String(texto || "")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/[^a-zA-Z0-9 ]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase();
        return limpo.slice(0, maximo);
    }

    /** Campo EMV: <id><length><valor> */
    function campo(id, valor) {
        const v = String(valor);
        return id + String(v.length).padStart(2, "0") + v;
    }

    /** CRC-16/CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF) */
    function crc16(str) {
        let crc = 0xffff;
        for (let i = 0; i < str.length; i++) {
            crc ^= str.charCodeAt(i) << 8;
            for (let bit = 0; bit < 8; bit++) {
                crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
            }
        }
        return crc.toString(16).toUpperCase().padStart(4, "0");
    }

    /**
     * Monta o payload PIX (EMV / BR Code).
     * @param {object} opts { chave, nome, cidade, valor, referencia }
     * @returns {string} payload copio-e-cola
     */
    function montarPayload(opts) {
        const chave = String((opts && opts.chave) || "").trim();
        if (!chave) return "";

        const nome = sanitizar((opts && opts.nome) || "LOJA", 25);
        const cidade = sanitizar((opts && opts.cidade) || "BRASIL", 15);
        const valor = Number(opts && opts.valor) || 0;
        const referencia = sanitizar((opts && opts.referencia) || "***", 25) || "***";

        // Merchant Account Information (PIX)
        const conta = campo("00", "BR.GOV.BCB.PIX") + campo("01", chave);
        // Additional Data Field (referência)
        const adicional = campo("05", referencia);

        let payload =
            campo("00", "01") +
            campo("26", conta) +
            campo("52", "0000") +
            campo("53", "986");

        if (valor > 0) {
            payload += campo("54", valor.toFixed(2));
        }

        payload +=
            campo("58", "BR") +
            campo("59", nome) +
            campo("60", cidade) +
            campo("62", adicional);

        payload += "6304";

        return payload + crc16(payload);
    }

    /** Retorna os dados do PIX da loja a partir do config.js. */
    function configLoja() {
        const cfg = (typeof window !== "undefined" && window.POINT_RD) || {};
        return {
            chave: cfg.pixChave || "",
            nome: cfg.pixNome || "POINT DO RD",
            cidade: cfg.pixCidade || "SALVADOR"
        };
    }

    /** O PIX da loja está configurado? */
    function configurado() {
        return Boolean(configLoja().chave);
    }

    /** Monta o payload com os dados da loja e o valor do pedido. */
    function montarParaLoja(valor, referencia) {
        const loja = configLoja();
        if (!loja.chave) return "";
        return montarPayload({
            chave: loja.chave,
            nome: loja.nome,
            cidade: loja.cidade,
            valor,
            referencia: referencia || "***"
        });
    }

    /** Renderiza o QR Code dentro de um elemento (usa a lib qrcodejs do CDN). */
    function renderizarQR(el, payload) {
        if (!el || !payload) return false;
        el.innerHTML = "";
        if (typeof QRCode === "undefined") return false; // lib não carregou
        try {
            new QRCode(el, {
                text: payload,
                width: 220,
                height: 220,
                colorDark: "#111111",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
            return true;
        } catch (erro) {
            return false;
        }
    }

    /** Copia o texto para a área de transferência (com fallback). */
    function copiar(texto) {
        if (!texto) return Promise.resolve(false);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(texto).then(() => true, () => false);
        }
        return new Promise((resolve) => {
            try {
                const area = document.createElement("textarea");
                area.value = texto;
                area.style.cssText = "position:fixed;opacity:0;top:0;left:0";
                document.body.appendChild(area);
                area.select();
                const ok = document.execCommand("copy");
                document.body.removeChild(area);
                resolve(ok);
            } catch (e) {
                resolve(false);
            }
        });
    }

    const api = { montarPayload, montarParaLoja, configLoja, configurado, renderizarQR, copiar, sanitizar };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    root.PointRDPix = api;
})(typeof window !== "undefined" ? window : globalThis);
