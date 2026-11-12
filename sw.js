/* ============================================================
   Service Worker - Point do RD
   Guarda o site no celular para abrir rápido e funcionar
   mesmo com internet fraca (offline parcial).
   ============================================================ */

const VERSAO = "point-do-rd-v25";
const CACHE_APP = `${VERSAO}-app`;
const CACHE_IMAGENS = `${VERSAO}-imagens`;

const ARQUIVOS_APP = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./config.js",
    "./firebase.js",
    "./firebase-config.js",
    "./pix.js",
    "./admin.html",
    "./manifest.json",
    "./imagem/logo-rd-web.png",
    "./imagem/banner.jpg",
    "./imagem/og-image.jpg",
    "./imagem/icons/icon-192.png",
    "./imagem/icons/icon-512.png",
    "./imagem/icons/maskable-512.png",
    "./imagem/icons/apple-touch-icon.png",
    "./imagem/icons/favicon-48.png",
    "./imagem/cardapio/calabresa.jpg",
    "./imagem/cardapio/mista.jpg",
    "./imagem/cardapio/mussarela.jpg",
    "./imagem/cardapio/portuguesa.jpg",
    "./imagem/cardapio/tres-queijos.jpg",
    "./imagem/cardapio/frango-catupiry.jpg",
    "./imagem/cardapio/atum.jpg",
    "./imagem/cardapio/bacon.jpg",
    "./imagem/cardapio/romeu-e-julieta.jpg",
    "./imagem/cardapio/brigadeiro.jpg",
    "./imagem/cardapio/doce-de-leite.jpg",
    "./imagem/cardapio/pizza-padrao.jpg"
];

// Recursos externos que valem a pena guardar para o app abrir bonito offline.
// (Deixamos as fontes do Font Awesome fora do cache: elas carregam normal pela rede.)
const IMAGENS_EXTERNAS = [];

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_APP);
        await cache.addAll(ARQUIVOS_APP);
        // Imagens externas não podem derrubar a instalação se estiverem lentas.
        const cacheImg = await caches.open(CACHE_IMAGENS);
        await Promise.allSettled(
            IMAGENS_EXTERNAS.map((url) =>
                fetch(url, { mode: "no-cors" }).then((resp) => cacheImg.put(url, resp))
            )
        );
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const chaves = await caches.keys();
        await Promise.all(
            chaves
                .filter((k) => !k.startsWith(VERSAO))
                .map((k) => caches.delete(k))
        );
        await self.clients.claim();
    })());
});

self.addEventListener("message", (event) => {
    if (event.data === "atualizar-cache") {
        self.skipWaiting();
    }
});

self.addEventListener("fetch", (event) => {
    const req = event.request;

    // Só tratamos GET. Pedidos (POST) vão sempre para o servidor.
    if (req.method !== "GET") return;

    const url = new URL(req.url);

    // Nunca cachear a API de pedidos / impressão.
    if (url.pathname.startsWith("/api/")) return;

    // Páginas: rede primeiro (para ver o cardápio atualizado), cache como reserva.
    if (req.mode === "navigate") {
        event.respondWith((async () => {
            try {
                const resp = await fetch(req);
                const cache = await caches.open(CACHE_APP);
                cache.put("./index.html", resp.clone());
                return resp;
            } catch (e) {
                const cache = await caches.open(CACHE_APP);
                return (await cache.match("./index.html")) || Response.error();
            }
        })());
        return;
    }

    // Arquivos do próprio site: cache primeiro.
    if (url.origin === self.location.origin) {
        // config.js sempre tenta a rede primeiro (mudou o endereço do servidor?)
        if (url.pathname.endsWith("/config.js")) {
            event.respondWith((async () => {
                const cache = await caches.open(CACHE_APP);
                try {
                    const resp = await fetch(req);
                    if (resp && resp.ok) cache.put(req, resp.clone());
                    return resp;
                } catch (e) {
                    return (await cache.match(req)) || Response.error();
                }
            })());
            return;
        }

        event.respondWith((async () => {
            const cache = await caches.open(CACHE_APP);
            const emCache = await cache.match(req, { ignoreSearch: true });
            if (emCache) {
                fetch(req)
                    .then((resp) => { if (resp && resp.ok) cache.put(req, resp.clone()); })
                    .catch(() => {});
                return emCache;
            }
            try {
                const resp = await fetch(req);
                if (resp && resp.ok) cache.put(req, resp.clone());
                return resp;
            } catch (e) {
                return Response.error();
            }
        })());
        return;
    }

    // Fotos externas: cache primeiro, atualiza em segundo plano.
    // (Fontes e CSS de terceiros seguem direto para a rede.)
    if (req.destination === "image") {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_IMAGENS);
            const emCache = await cache.match(req);
            if (emCache) return emCache;
            try {
                const resp = await fetch(req);
                if (resp && (resp.ok || resp.type === "opaque")) {
                    cache.put(req, resp.clone());
                }
                return resp;
            } catch (e) {
                return Response.error();
            }
        })());
    }
});
