/* ============================================================
   Firebase - Point do RD
   Salva o pedido no Firestore para a loja acompanhar no painel.
   Se o Firebase não estiver configurado, o pedido vai só pelo
   WhatsApp e nada quebra.
   ============================================================ */

(function () {

    function configurado() {
        const c = window.FIREBASE_CONFIG;
        return Boolean(
            window.firebase &&
            c &&
            typeof c.projectId === "string" &&
            c.projectId.length > 0 &&
            !c.projectId.startsWith("COLE")
        );
    }

    function iniciar() {
        if (!configurado()) return null;
        if (!window.FIREBASE_APP) {
            window.FIREBASE_APP = firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        return window.FIREBASE_APP;
    }

    /* Número do pedido do dia (1, 2, 3... reinicia a cada dia) */
    async function proximoNumero(db) {
        const idDia = new Date().toISOString().slice(0, 10);
        const ref = db.collection("contadores").doc(idDia);

        const numero = await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const atual = snap.exists ? Number(snap.data().valor) || 0 : 0;
            tx.set(ref, { valor: atual + 1 });
            return atual + 1;
        });

        return numero;
    }

    /**
     * Salva o pedido no Firestore.
     * Nunca lança erro: se der problema, retorna null e o site
     * segue a vida (o pedido chega pelo WhatsApp).
     */
    async function salvarPedido(pedido) {
        const app = iniciar();
        if (!app) return null;

        const db = firebase.firestore();

        try {
            let numero = null;
            try {
                numero = await Promise.race([
                    proximoNumero(db),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("tempo esgotado")), 4000))
                ]);
            } catch (erro) {
                console.warn("Firebase: número do pedido não gerado:", erro.message);
            }

            const ref = await Promise.race([
                db.collection("pedidos").add({
                    numero,
                    nome: pedido.nome,
                    telefone: pedido.telefone || "",
                    endereco: pedido.endereco,
                    referencia: pedido.referencia || "",
                    pagamento: pedido.pagamento,
                    troco: pedido.troco || "",
                    observacao: pedido.observacao || "",
                    taxaEntrega: Number(pedido.taxaEntrega) || 0,
                    total: Number(pedido.total) || 0,
                    itens: pedido.itens || [],
                    origem: pedido.origem || "site",
                    status: "novo",
                    criadoEm: new Date().toISOString(),
                    criadoTs: firebase.firestore.FieldValue.serverTimestamp()
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("tempo esgotado")), 6000))
            ]);

            return { id: ref.id, numero };
        } catch (erro) {
            console.warn("Firebase: pedido não salvo no banco:", erro.message);
            return null;
        }
    }

    window.PointRDFirebase = { configurado, salvarPedido };
})();
