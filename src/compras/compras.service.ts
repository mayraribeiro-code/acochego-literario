import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusCompra, TipoUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Paginacao, skipTake } from '../common/paginacao';
import { GatewayPagamento } from '../pagamentos/gateway-pagamento';
import { recalcularMediaDoLivro } from '../avaliacoes/media';
import { CartaoDto } from './dtos/compra';

const incluirLivro = {
  livro: { include: { autor: true, genero: true } },
} as const;

// Uma compra "iniciada" há mais tempo que isso é considerada abandonada
// (ex.: a API caiu no meio do pagamento) e pode ser tentada de novo.
const PRAZO_COMPRA_INICIADA_MS = 5 * 60 * 1000;

@Injectable()
export class ComprasService {
  private logger = new Logger('ComprasService');

  constructor(
    private prismaService: PrismaService,
    private gateway: GatewayPagamento,
  ) {}

  // 1. reserva a compra como "iniciada" (impede dois pagamentos ao mesmo tempo);
  // 2. cobra no gateway (livro gratuito pula essa etapa);
  // 3. marca "confirmada" ou "falha" conforme a resposta.
  async comprar(usuarioId: string, livroId: string, cartao?: CartaoDto) {
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

    const gratuito = livro.precoCentavos === 0;
    if (!gratuito) {
      if (!cartao) {
        throw new BadRequestException('Informe os dados do cartão');
      }
      if (cartaoVencido(cartao)) {
        throw new BadRequestException('O cartão está vencido');
      }
    }

    const compra = await this.reservar(usuarioId, livroId, livro.precoCentavos);

    if (gratuito) {
      return this.finalizar(compra.id, { status: StatusCompra.confirmada });
    }

    let resultado: Awaited<ReturnType<GatewayPagamento['cobrar']>>;
    try {
      resultado = await this.gateway.cobrar({
        valorCentavos: livro.precoCentavos,
        descricao: `Livro: ${livro.titulo}`,
        cartao: cartao!,
      });
    } catch (erro) {
      this.logger.error(`Falha ao falar com o gateway: ${String(erro)}`);
      await this.finalizar(compra.id, {
        status: StatusCompra.falha,
        motivoFalha: 'Serviço de pagamento indisponível',
      });
      throw new BadGatewayException(
        'Não foi possível processar o pagamento agora. Tente novamente',
      );
    }

    if (!resultado.aprovado) {
      await this.finalizar(compra.id, {
        status: StatusCompra.falha,
        motivoFalha: resultado.motivo,
      });
      throw new HttpException(resultado.motivo, HttpStatus.PAYMENT_REQUIRED);
    }

    return this.finalizar(compra.id, {
      status: StatusCompra.confirmada,
      transacaoId: resultado.transacaoId,
      cartaoFinal: cartao!.numero.slice(-4),
    });
  }

  // Cria a compra como "iniciada" ou reaproveita uma que falhou, foi
  // cancelada ou ficou abandonada. A troca de status é feita com uma condição
  // no próprio UPDATE, então duas requisições simultâneas não pagam duas vezes.
  private async reservar(
    usuarioId: string,
    livroId: string,
    valorCentavos: number,
  ) {
    const existente = await this.prismaService.compra.findUnique({
      where: { usuarioId_livroId: { usuarioId, livroId } },
    });

    const novaTentativa = {
      status: StatusCompra.iniciada,
      valorCentavos,
      transacaoId: null,
      cartaoFinal: null,
      motivoFalha: null,
      canceladaEm: null,
      createdAt: new Date(),
    };

    if (!existente) {
      try {
        return await this.prismaService.compra.create({
          data: { usuarioId, livroId, ...novaTentativa },
        });
      } catch (erro) {
        // Outra requisição criou a compra entre o findUnique e o create.
        if (
          erro instanceof Prisma.PrismaClientKnownRequestError &&
          erro.code === 'P2002'
        ) {
          throw new ConflictException(
            'Já existe um pagamento em andamento para este livro',
          );
        }
        throw erro;
      }
    }

    if (existente.status === StatusCompra.confirmada) {
      throw new ConflictException('Você já possui este livro');
    }

    const { count } = await this.prismaService.compra.updateMany({
      where: {
        id: existente.id,
        OR: [
          { status: { in: [StatusCompra.falha, StatusCompra.cancelada] } },
          {
            status: StatusCompra.iniciada,
            updatedAt: { lt: new Date(Date.now() - PRAZO_COMPRA_INICIADA_MS) },
          },
        ],
      },
      data: novaTentativa,
    });
    if (count === 0) {
      throw new ConflictException(
        'Já existe um pagamento em andamento para este livro',
      );
    }

    return existente;
  }

  private finalizar(id: string, data: Prisma.CompraUpdateInput) {
    return this.prismaService.compra.update({
      where: { id },
      data,
      include: incluirLivro,
    });
  }

  // Cancelamento pelo admin: estorna o pagamento, tira o livro da biblioteca
  // (a leitura exige compra confirmada) e apaga a avaliação do cliente, já que
  // só quem comprou pode avaliar. O progresso de leitura é mantido, para o caso
  // de o cliente comprar de novo.
  async cancelar(id: string) {
    const compra = await this.prismaService.compra.findUnique({
      where: { id },
    });
    if (!compra) {
      throw new NotFoundException('Compra não encontrada');
    }
    if (compra.status !== StatusCompra.confirmada) {
      throw new BadRequestException(
        'Só compras confirmadas podem ser canceladas',
      );
    }

    // Estorna antes de mudar o banco: se o gateway falhar, nada muda.
    if (compra.transacaoId) {
      try {
        await this.gateway.estornar(compra.transacaoId);
      } catch (erro) {
        this.logger.error(`Falha no estorno de ${id}: ${String(erro)}`);
        throw new BadGatewayException(
          'Não foi possível estornar o pagamento agora. Tente novamente',
        );
      }
    }

    return this.prismaService.$transaction(async (tx) => {
      const cancelada = await tx.compra.update({
        where: { id },
        data: { status: StatusCompra.cancelada, canceladaEm: new Date() },
        include: {
          usuario: { select: { id: true, nome: true } },
          livro: { select: { id: true, titulo: true } },
        },
      });

      const { count } = await tx.avaliacao.deleteMany({
        where: { usuarioId: compra.usuarioId, livroId: compra.livroId },
      });
      if (count > 0) {
        await recalcularMediaDoLivro(tx, compra.livroId);
      }

      return cancelada;
    });
  }

  // Compras do próprio usuário: é daqui que sai a "Minha Biblioteca".
  listarDoUsuario(usuarioId: string) {
    return this.prismaService.compra.findMany({
      where: { usuarioId, status: StatusCompra.confirmada },
      include: incluirLivro,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listarTodas(paginacao: Paginacao) {
    const [itens, total] = await this.prismaService.$transaction([
      this.prismaService.compra.findMany({
        include: {
          usuario: { select: { id: true, nome: true } },
          livro: { select: { id: true, titulo: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...skipTake(paginacao),
      }),
      this.prismaService.compra.count(),
    ]);

    return { itens, total, ...paginacao };
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

// O cartão vale até o último dia do mês de validade.
function cartaoVencido({ mesValidade, anoValidade }: CartaoDto) {
  const primeiroDiaDepois = new Date(anoValidade, mesValidade, 1);
  return primeiroDiaDepois.getTime() <= Date.now();
}
