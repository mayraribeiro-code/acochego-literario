import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Cobranca,
  CobrancaPix,
  GatewayPagamento,
  PixGerado,
  ResultadoCobranca,
} from './gateway-pagamento';
import { gerarPixCopiaECola } from './pix';

export const CHAVE_PIX_DE_TESTE = 'pix-teste@aconchego.invalid';
export const VALIDADE_PIX_MS = 15 * 60 * 1000;

// Cartões de teste: o resultado depende do número, como nos ambientes de
// teste dos serviços reais. Qualquer outro número válido é aprovado.
export const CARTOES_DE_TESTE = {
  aprovado: '4242424242424242',
  recusado: '4000000000000002',
  saldoInsuficiente: '4000000000009995',
} as const;

// Algoritmo de Luhn: o dígito verificador que todo número de cartão tem.
export function numeroDeCartaoValido(numero: string) {
  if (!/^\d{13,19}$/.test(numero)) return false;
  let soma = 0;
  for (let i = 0; i < numero.length; i++) {
    let digito = Number(numero[numero.length - 1 - i]);
    if (i % 2 === 1) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    soma += digito;
  }
  return soma % 10 === 0;
}

// Não cobra nada de verdade e não guarda nenhum dado do cartão.
@Injectable()
export class GatewaySimulado extends GatewayPagamento {
  private logger = new Logger('GatewaySimulado');

  cobrar({ valorCentavos, cartao }: Cobranca): Promise<ResultadoCobranca> {
    if (!numeroDeCartaoValido(cartao.numero)) {
      return Promise.resolve({
        aprovado: false,
        motivo: 'Número de cartão inválido',
      });
    }
    if (cartao.numero === CARTOES_DE_TESTE.recusado) {
      return Promise.resolve({
        aprovado: false,
        motivo: 'Pagamento recusado pelo banco emissor',
      });
    }
    if (cartao.numero === CARTOES_DE_TESTE.saldoInsuficiente) {
      return Promise.resolve({
        aprovado: false,
        motivo: 'Saldo ou limite insuficiente',
      });
    }

    const transacaoId = `sim_${randomUUID()}`;
    // Só o valor e o id; nunca registrar dados do cartão em log.
    this.logger.log(`Cobrança aprovada: ${transacaoId} (${valorCentavos})`);
    return Promise.resolve({ aprovado: true, transacaoId });
  }

  // A chave usa o domínio reservado ".invalid", que não pode existir como
  // chave Pix de verdade: se alguém escanear o QR code num app de banco, o
  // app recusa e nenhum dinheiro é movido. O pagamento é confirmado pelo
  // botão "Simular pagamento" do site.
  readonly permiteSimularPix = true;

  criarPix({ valorCentavos, referencia }: CobrancaPix): Promise<PixGerado> {
    const transacaoId = `sim_pix_${randomUUID()}`;
    const copiaECola = gerarPixCopiaECola({
      chave: CHAVE_PIX_DE_TESTE,
      nomeRecebedor: 'Aconchego Literario',
      cidade: 'Sao Paulo',
      valorCentavos,
      txid: referencia,
    });
    this.logger.log(`Pix criado: ${transacaoId} (${valorCentavos})`);
    return Promise.resolve({
      transacaoId,
      copiaECola,
      expiraEm: new Date(Date.now() + VALIDADE_PIX_MS),
    });
  }

  estornar(transacaoId: string): Promise<void> {
    this.logger.log(`Estorno: ${transacaoId}`);
    return Promise.resolve();
  }
}
