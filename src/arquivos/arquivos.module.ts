import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ArquivosService } from './arquivos.service';
import { AdminArquivosController } from './admin-arquivos.controller';
import { LeituraController } from './leitura.controller';

@Module({
  providers: [ArquivosService, PrismaService],
  controllers: [AdminArquivosController, LeituraController],
})
export class ArquivosModule {}
