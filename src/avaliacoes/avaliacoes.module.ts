import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvaliacoesService } from './avaliacoes.service';
import { AvaliacoesController } from './avaliacoes.controller';
import { AdminAvaliacoesController } from './admin-avaliacoes.controller';

@Module({
  providers: [AvaliacoesService, PrismaService],
  controllers: [AvaliacoesController, AdminAvaliacoesController],
})
export class AvaliacoesModule {}
