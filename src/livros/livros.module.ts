import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LivrosService } from './livros.service';
import { LivrosController } from './livros.controller';
import { AdminLivrosController } from './admin-livros.controller';

@Module({
  providers: [LivrosService, PrismaService],
  controllers: [LivrosController, AdminLivrosController],
})
export class LivrosModule {}
