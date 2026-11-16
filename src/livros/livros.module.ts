import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LivrosService } from './livros.service';
import { LivrosController } from './livros.controller';
import { AdminLivrosController } from './admin-livros.controller';
import { CapasService } from './capas.service';
import { AdminCapasController } from './admin-capas.controller';

@Module({
  providers: [LivrosService, CapasService, PrismaService],
  controllers: [LivrosController, AdminLivrosController, AdminCapasController],
})
export class LivrosModule {}
