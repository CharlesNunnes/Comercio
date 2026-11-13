/* ============================================================
   CONFIGURAÇÕES DO SITE - Point do RD
   Edite este arquivo para mudar telefone, taxa, entrega e PIX.
   ============================================================ */

window.POINT_RD = {
    // Endereço do servidor que manda o pedido para a impressora.
    // Deixe "" quando o site for aberto pelo próprio servidor de impressão.
    // Se o site estiver hospedado na internet, coloque o endereço completo, ex:
    // "https://pedidos.pointdord.com.br"
    api: "",

    // WhatsApp da loja (somente números, com 55 + DDD)
    whatsapp: "5571988580935",

    // Taxa de entrega em reais (0 = grátis)
    taxaEntrega: 0,

    // Tempo médio de entrega mostrado no site
    tempoEntrega: "40 a 60 minutos",

    // Liga/desliga o envio automático para a impressora.
    // false = o pedido vai direto para o WhatsApp da loja (modo atual, sem impressora).
    // Quando tiver a impressora, configure servidor/config.json e mude para true.
    impressaoAutomatica: false,

    // Nome que aparece no topo do cupom impresso e nas mensagens
    nomeLoja: "POINT DO RD",

    // ============================
    // ACESSO AO PAINEL DE PEDIDOS
    // ============================
    // UID do proprietário no Firebase (Authentication > Users).
    // É um identificador público e NÃO revela o e-mail da conta.
    // Precisa ser o MESMO UID usado em firestore.rules.
    adminUid: "dbcAUPvHBQSQTggxkrrHapGNBAA2",

    // ============================
    // PIX DA LOJA (opcional, mas recomendado)
    // ============================
    // Chave PIX da loja: CPF/CNPJ, e-mail, telefone (celular) ou chave aleatória.
    // Exemplo de chave tipo e-mail: "contato@pointdord.com.br"
    pixChave: "",

    // Nome que aparece no app do banco ao pagar (máx. 25 caracteres, sem acento)
    pixNome: "POINT DO RD",

    // Cidade que aparece no app do banco ao pagar (máx. 15 caracteres, sem acento)
    pixCidade: "SALVADOR"
};
