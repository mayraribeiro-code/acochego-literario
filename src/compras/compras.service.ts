import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusCompra, TipoUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const incluirLivro = {
  livro: { include: { autor: true, genero: true } },
} as const;

@Injectable()
export class ComprasService {
  constructor(private prismaService: PrismaService) {}

  // Ainda não há meio de pagamento: a compra já nasce confirmada.
  async comprar(usuarioId: string, livroId: string) {
    const livro = await this.prismaService.livro.findUnique({
      where: { id: livroId },
    });

    if (!livro || !livro.ativo) {
      throw new NotFoundException('Livro não encontrado');
    }

    if (!livro.disponivel) {
      throw new BadRequestException(
        'Este livro ainda não está disponível para compra',
      );
    }

    try {
      return await this.prismaService.compra.create({
        data: {
          usuarioId,
          livroId,
          valorCentavos: livro.precoCentavos,
          status: StatusCompra.confirmada,
        },
        include: incluirLivro,
      });
    } catch (erro) {
      // Violação do @@unique([usuarioId, livroId]): o usuário já tem o livro.
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2002'
      ) {
        throw new ConflictException('Você já possui este livro');
      }
      throw erro;
    }
  }

  // Compras do próprio usuário: é daqui que sai a "Minha Biblioteca".
  listarDoUsuario(usuarioId: string) {
    return this.prismaService.compra.findMany({
      where: { usuarioId, status: StatusCompra.confirmada },
      include: incluirLivro,
      orderBy: { createdAt: 'desc' },
    });
  }

  listarTodas() {
    return this.prismaService.compra.findMany({
      include: {
        usuario: { select: { id: true, nome: true } },
        livro: { select: { id: true, titulo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resumo() {
    const [livrosAtivos, compras, clientes, receita] = await Promise.all([
      this.prismaService.livro.count({ where: { ativo: true } }),
      this.prismaService.compra.count({
        where: { status: StatusCompra.confirmada },
      }),
      this.prismaService.usuario.count({
        where: { tipoUsuario: TipoUsuario.comum },
      }),
      this.prismaService.compra.aggregate({
        where: { status: StatusCompra.confirmada },
        _sum: { valorCentavos: true },
      }),
    ]);

    return {
      livrosAtivos,
      compras,
      clientes,
      receitaCentavos: receita._sum.valorCentavos ?? 0,
    };
  }
}
