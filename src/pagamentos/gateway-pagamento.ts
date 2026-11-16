// Contrato com o serviço que cobra o cliente. O restante da API só conhece
// esta classe: para trocar o pagamento simulado por um serviço real (Mercado
// Pago, Stripe...), basta escrever outra implementação e registrá-la no
// PagamentosModule.
//
// Atenção: aqui a API recebe os dados do cartão porque o gateway é simulado.
// Num serviço real, o site envia o cartão direto para o serviço (que devolve
// um token) e a API recebe só esse token, para que o número do cartão nunca
// passe pelo nosso servidor.

export interface DadosCartao {
  numero: string;
  nomeTitular: string;
  // Mês e ano de validade (ex.: 12 e 2030).
  mesValidade: number;
  anoValidade: number;
  cvv: string;
}

export interface Cobranca {
  valorCentavos: number;
  descricao: string;
  cartao: DadosCartao;
}

export type ResultadoCobranca =
  { aprovado: true; transacaoId: string } | { aprovado: false; motivo: string };

export interface CobrancaPix {
  valorCentavos: number;
  descricao: string;
  // Identificador da compra; vai dentro do código Pix (txid).
  referencia: string;
}

export interface PixGerado {
  transacaoId: string;
  // Texto do "Pix copia e cola"; o QR code é esse texto em forma de imagem.
  copiaECola: string;
  expiraEm: Date;
}

export abstract class GatewayPagamento {
  abstract cobrar(cobranca: Cobranca): Promise<ResultadoCobranca>;

  // Cria uma cobrança Pix. O pagamento acontece depois, no app do banco do
  // cliente; num serviço real, o serviço avisa a API por um webhook e a API
  // chama ComprasService.confirmarPix.
  abstract criarPix(cobranca: CobrancaPix): Promise<PixGerado>;

  // Devolve ao cliente o valor de uma cobrança aprovada.
  abstract estornar(transacaoId: string): Promise<void>;

  // Só o gateway simulado permite "pagar" um Pix por um botão do site.
  readonly permiteSimularPix: boolean = false;
}
