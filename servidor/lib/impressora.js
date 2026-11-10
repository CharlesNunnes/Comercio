/* ============================================================
   Impressora - Point do RD
   Modos suportados:
     rede    -> impressora térmica com placa de rede (porta 9100)
     windows -> impressora instalada no Windows (driver/spooler)
     arquivo -> salva o cupom em .txt (modo teste, não imprime)
     nenhuma -> impressão desativada
   ============================================================ */

const net = require("net");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const { renderTexto, renderEscPos } = require("./cupom");

const PASTA_CUPONS = path.join(__dirname, "..", "dados", "cupons");

function garantirPasta() {
    fs.mkdirSync(PASTA_CUPONS, { recursive: true });
}

function escaparPowerShell(texto) {
    return String(texto).replace(/'/g, "''");
}

function enviarRede(buffer, cfg) {
    return new Promise((resolve, reject) => {
        const host = cfg.host;
        const porta = Number(cfg.portaRede || 9100);

        if (!host) {
            reject(new Error("Informe o IP da impressora no config.json (impressora.host)."));
            return;
        }

        const socket = net.createConnection({ host, port: porta, timeout: 6000 });
        let finalizado = false;

        const terminar = (erro) => {
            if (finalizado) return;
            finalizado = true;
            socket.destroy();
            erro ? reject(erro) : resolve();
        };

        socket.on("connect", () => {
            socket.write(buffer, () => {
                socket.end();
                terminar();
            });
        });

        socket.on("timeout", () => terminar(new Error(`Tempo esgotado ao conectar em ${host}:${porta}.`)));
        socket.on("error", (erro) => terminar(new Error(`Falha na impressora ${host}:${porta} - ${erro.message}`)));
        socket.on("close", () => terminar());
    });
}

function enviarWindows(texto, cfg) {
    return new Promise((resolve, reject) => {
        garantirPasta();
        const arquivo = path.join(os.tmpdir(), `point-rd-cupom-${Date.now()}.txt`);
        fs.writeFileSync(arquivo, texto, "utf8");

        const nome = (cfg.nomeWindows || "").trim();
        const destino = nome ? ` -Name '${escaparPowerShell(nome)}'` : "";
        const comando = `Get-Content -LiteralPath '${escaparPowerShell(arquivo)}' -Raw -Encoding UTF8 | Out-Printer${destino}`;

        const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", comando], {
            windowsHide: true
        });

        let erroSaida = "";
        ps.stderr.on("data", (d) => { erroSaida += d.toString(); });

        ps.on("error", (erro) => reject(new Error(`Não foi possível chamar o Windows: ${erro.message}`)));

        ps.on("close", (codigo) => {
            try { fs.unlinkSync(arquivo); } catch (e) { /* ignora */ }
            if (codigo === 0) {
                resolve();
            } else {
                reject(new Error(erroSaida.trim() || `O Windows retornou código ${codigo}. Verifique o nome da impressora.`));
            }
        });
    });
}

function salvarArquivo(texto, pedido) {
    garantirPasta();
    const numero = String(pedido.numero || 0).padStart(4, "0");
    const arquivo = path.join(PASTA_CUPONS, `pedido-${numero}.txt`);
    fs.writeFileSync(arquivo, texto, "utf8");
    return arquivo;
}

/**
 * Imprime um pedido.
 * @returns {Promise<{ok:boolean, mensagem:string, arquivo?:string}>}
 */
async function imprimirPedido(cfg, pedido, blocos) {
    const cupom = { blocos, largura: cfg.largura || 48 };

    // Sempre salvamos uma cópia em texto (histórico/backup).
    const texto = renderTexto(cupom);
    let arquivo = null;
    try {
        arquivo = salvarArquivo(texto, pedido);
    } catch (e) { /* não impede a impressão */ }

    const tipo = (cfg.tipo || "arquivo").toLowerCase();

    try {
        if (tipo === "rede") {
            const buffer = renderEscPos(cupom, cfg);
            for (let i = 0; i < Math.max(1, Number(cfg.copias) || 1); i++) {
                await enviarRede(buffer, cfg);
            }
            return { ok: true, mensagem: "Cupom enviado para a impressora de rede.", arquivo };
        }

        if (tipo === "windows") {
            for (let i = 0; i < Math.max(1, Number(cfg.copias) || 1); i++) {
                await enviarWindows(texto, cfg);
            }
            return { ok: true, mensagem: "Cupom enviado para a impressora do Windows.", arquivo };
        }

        if (tipo === "nenhuma") {
            return { ok: false, mensagem: "Impressão desativada (modo teste). Cupom salvo em arquivo.", arquivo };
        }

        return { ok: true, mensagem: `Modo teste: cupom salvo em ${arquivo}`, arquivo };
    } catch (erro) {
        return { ok: false, mensagem: erro.message, arquivo };
    }
}

/** Verifica se a impressora está acessível. */
function statusImpressora(cfg) {
    const tipo = (cfg.tipo || "arquivo").toLowerCase();

    if (tipo === "rede") {
        return new Promise((resolve) => {
            const host = cfg.host;
            const porta = Number(cfg.portaRede || 9100);

            if (!host) {
                resolve({ ok: false, tipo, mensagem: "IP da impressora não configurado." });
                return;
            }

            const socket = net.createConnection({ host, port: porta, timeout: 2500 });
            const fim = (ok, mensagem) => {
                socket.destroy();
                resolve({ ok, tipo, mensagem });
            };

            socket.on("connect", () => fim(true, `Conectada em ${host}:${porta}`));
            socket.on("timeout", () => fim(false, `Sem resposta de ${host}:${porta}`));
            socket.on("error", (erro) => fim(false, erro.message));
        });
    }

    if (tipo === "windows") {
        return new Promise((resolve) => {
            const nome = (cfg.nomeWindows || "").trim();
            const comando = nome
                ? `(Get-Printer -Name '${escaparPowerShell(nome)}' -ErrorAction SilentlyContinue).Name`
                : `(Get-CimInstance Win32_Printer | Where-Object { $_.Default -eq $true }).Name`;

            const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", comando], {
                windowsHide: true
            });

            let saida = "";
            ps.stdout.on("data", (d) => { saida += d.toString(); });
            ps.on("error", () => resolve({ ok: false, tipo, mensagem: "PowerShell indisponível." }));
            ps.on("close", () => {
                const encontrada = saida.trim();
                if (encontrada) {
                    resolve({ ok: true, tipo, mensagem: `Impressora encontrada: ${encontrada}` });
                } else {
                    resolve({
                        ok: false,
                        tipo,
                        mensagem: nome
                            ? `Impressora "${nome}" não encontrada no Windows.`
                            : "Nenhuma impressora padrão definida no Windows."
                    });
                }
            });
        });
    }

    if (tipo === "nenhuma") {
        return Promise.resolve({ ok: false, tipo, mensagem: "Impressão desativada no config.json." });
    }

    return Promise.resolve({ ok: true, tipo, mensagem: "Modo teste: cupons salvos em arquivo." });
}

module.exports = { imprimirPedido, statusImpressora };
