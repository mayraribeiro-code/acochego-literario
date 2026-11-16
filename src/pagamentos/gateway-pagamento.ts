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

export abstract class GatewayPagamento {
  abstract cobrar(cobranca: Cobranca): Promise<ResultadoCobranca>;

  // Devolve ao cliente o valor de uma cobrança aprovada.
  abstract estornar(transacaoId: string): Promise<void>;
}
