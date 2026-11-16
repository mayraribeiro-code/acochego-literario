import { Module } from '@nestjs/common';
import { GatewayPagamento } from './gateway-pagamento';
import { GatewaySimulado } from './gateway-simulado';

// Para usar um serviço de pagamento real, troque GatewaySimulado aqui.
@Module({
  providers: [{ provide: GatewayPagamento, useClass: GatewaySimulado }],
  exports: [GatewayPagamento],
})
export class PagamentosModule {}
