import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { AdminComprasController } from './admin-compras.controller';
import { PagamentosModule } from '../pagamentos/pagamentos.module';

@Module({
  imports: [PagamentosModule],
  providers: [ComprasService, PrismaService],
  controllers: [ComprasController, AdminComprasController],
})
export class ComprasModule {}
