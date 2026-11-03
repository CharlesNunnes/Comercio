/* ============================================================
   CONFIGURAÇÕES DO SITE - Point do RD
   Edite este arquivo para mudar telefone, taxa e servidor.
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

    // Nome que aparece no topo do cupom impresso
    nomeLoja: "POINT DO RD"
};
