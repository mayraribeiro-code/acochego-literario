import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusCompra } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SalvarAvaliacaoDto } from './dtos/avaliacao';
import { Paginacao, skipTake } from '../common/paginacao';
import { recalcularMediaDoLivro } from './media';

// O que é mostrado de cada avaliação: só o nome de quem avaliou, nunca o email.
const camposPublicos = {
  id: true,
  nota: true,
  comentario: true,
  createdAt: true,
  updatedAt: true,
  usuario: { select: { nome: true } },
} as const;

@Injectable()
export class AvaliacoesService {
  constructor(private prismaService: PrismaService) {}

  // Avaliações de um livro do catálogo, das mais novas para as mais antigas.
  // A ordem é pela criação (e não pela edição) para que editar uma avaliação
  // não a mude de página enquanto alguém navega pela lista.
  async listarDoLivro(livroId: string, paginacao: Paginacao) {
    const livro = await this.prismaService.livro.findFirst({
      where: { id: livroId, ativo: true },
      select: { id: true },
    });
    if (!livro) {
      throw new NotFoundException('Livro não encontrado');
    }

    const [itens, total] = await this.prismaService.$transaction([
      this.prismaService.avaliacao.findMany({
        where: { livroId },
        select: camposPublicos,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...skipTake(paginacao),
      }),
      this.prismaService.avaliacao.count({ where: { livroId } }),
    ]);

    return { itens, total, ...paginacao };
  }

  // A avaliação do próprio usuário, ou null se ele ainda não avaliou.
  minha(usuarioId: string, livroId: string) {
    return this.prismaService.avaliacao.findUnique({
      where: { usuarioId_livroId: { usuarioId, livroId } },
      select: camposPublicos,
    });
  }

  // Só quem comprou avalia. O livro pode estar inativo: ele continua na
  // biblioteca de quem comprou, como acontece na leitura.
  async salvar(usuarioId: string, livroId: string, dados: SalvarAvaliacaoDto) {
    const compra = await this.prismaService.compra.findUnique({
      where: { usuarioId_livroId: { usuarioId, livroId } },
    });
    if (!compra || compra.status !== StatusCompra.confirmada) {
      throw new ForbiddenException('Só quem comprou o livro pode avaliá-lo');
    }

    const nota = dados.nota;
    const comentario = dados.comentario?.trim() || null;

    return this.prismaService.$transaction(async (tx) => {
      const avaliacao = await tx.avaliacao.upsert({
        where: { usuarioId_livroId: { usuarioId, livroId } },
        create: { usuarioId, livroId, nota, comentario },
        update: { nota, comentario },
        select: camposPublicos,
      });
      await recalcularMediaDoLivro(tx, livroId);
      return avaliacao;
    });
  }

  async removerMinha(usuarioId: string, livroId: string) {
    const avaliacao = await this.prismaService.avaliacao.findUnique({
      where: { usuarioId_livroId: { usuarioId, livroId } },
    });
    if (!avaliacao) {
      throw new NotFoundException('Você ainda não avaliou este livro');
    }
    await this.remover(avaliacao.id, livroId);
  }

  // Moderação: o admin remove qualquer avaliação.
  async removerPorId(id: string) {
    const avaliacao = await this.prismaService.avaliacao.findUnique({
      where: { id },
    });
    if (!avaliacao) {
      throw new NotFoundException('Avaliação não encontrada');
    }
    await this.remover(id, avaliacao.livroId);
  }

  private remover(id: string, livroId: string) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.avaliacao.delete({ where: { id } });
      await recalcularMediaDoLivro(tx, livroId);
    });
  }
}
