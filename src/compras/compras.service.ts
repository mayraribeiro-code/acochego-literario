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
import {
  MetodoPagamento,
  Prisma,
  StatusCompra,
  TipoUsuario,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Paginacao, skipTake } from '../common/paginacao';
import { GatewayPagamento } from '../pagamentos/gateway-pagamento';
import { recalcularMediaDoLivro } from '../avaliacoes/media';
import { CartaoDto } from './dtos/compra';

const incluirLivro = {
  livro: { include: { autor: true, genero: true } },
} as const;

// Quanto tempo uma compra com cartão fica "iniciada" antes de ser considerada
// abandonada (ex.: a API caiu no meio do pagamento) e poder ser tentada de
// novo. O Pix usa a validade da cobrança, definida pelo gateway.
const PRAZO_CARTAO_MS = 5 * 60 * 1000;

@Injectable()
export class ComprasService {
  private logger = new Logger('ComprasService');

  constructor(
    private prismaService: PrismaService,
    private gateway: GatewayPagamento,
  ) {}

  // Cartão: reserva a compra como "iniciada", cobra e marca "confirmada" ou
  // "falha" na mesma requisição.
  // Pix: reserva, gera o código e devolve a compra ainda "iniciada"; ela vira
  // "confirmada" quando o pagamento chega (confirmarPix).
  // Livro gratuito: confirma direto, sem pagamento.
  async comprar(
    usuarioId: string,
    livroId: string,
    metodo: 'cartao' | 'pix' = 'cartao',
    cartao?: CartaoDto,
  ) {
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

    if (livro.precoCentavos === 0) {
      const compra = await this.reservar(
        usuarioId,
        livroId,
        0,
        PRAZO_CARTAO_MS,
      );
      return this.finalizar(compra.id, {
        status: StatusCompra.confirmada,
        metodo: MetodoPagamento.gratuito,
        expiraEm: null,
      });
    }

    if (metodo === 'pix') {
      return this.iniciarPix(usuarioId, livro);
    }

    if (!cartao) {
      throw new BadRequestException('Informe os dados do cartão');
    }
    if (cartaoVencido(cartao)) {
      throw new BadRequestException('O cartão está vencido');
    }

    const compra = await this.reservar(
      usuarioId,
      livroId,
      livro.precoCentavos,
      PRAZO_CARTAO_MS,
    );

    let resultado: Awaited<ReturnType<GatewayPagamento['cobrar']>>;
    try {
      resultado = await this.gateway.cobrar({
        valorCentavos: livro.precoCentavos,
        descricao: `Livro: ${livro.titulo}`,
        cartao,
      });
    } catch (erro) {
      this.logger.error(`Falha ao falar com o gateway: ${String(erro)}`);
      await this.finalizar(compra.id, {
        status: StatusCompra.falha,
        metodo: MetodoPagamento.cartao,
        motivoFalha: 'Serviço de pagamento indisponível',
      });
      throw new BadGatewayException(
        'Não foi possível processar o pagamento agora. Tente novamente',
      );
    }

    if (!resultado.aprovado) {
      await this.finalizar(compra.id, {
        status: StatusCompra.falha,
        metodo: MetodoPagamento.cartao,
        cartaoFinal: cartao.numero.slice(-4),
        motivoFalha: resultado.motivo,
      });
      throw new HttpException(resultado.motivo, HttpStatus.PAYMENT_REQUIRED);
    }

    return this.finalizar(compra.id, {
      status: StatusCompra.confirmada,
      metodo: MetodoPagamento.cartao,
      transacaoId: resultado.transacaoId,
      cartaoFinal: cartao.numero.slice(-4),
      expiraEm: null,
    });
  }

  private async iniciarPix(
    usuarioId: string,
    livro: { id: string; titulo: string; precoCentavos: number },
  ) {
    // A reserva vale o tempo de gerar o código; depois passa a valer a
    // validade do Pix devolvida pelo gateway.
    const compra = await this.reservar(
      usuarioId,
      livro.id,
      livro.precoCentavos,
      PRAZO_CARTAO_MS,
    );

    let pix: Awaited<ReturnType<GatewayPagamento['criarPix']>>;
    try {
      pix = await this.gateway.criarPix({
        valorCentavos: livro.precoCentavos,
        descricao: `Livro: ${livro.titulo}`,
        referencia: compra.id,
      });
    } catch (erro) {
      this.logger.error(`Falha ao gerar Pix: ${String(erro)}`);
      await this.finalizar(compra.id, {
        status: StatusCompra.falha,
        metodo: MetodoPagamento.pix,
        motivoFalha: 'Serviço de pagamento indisponível',
      });
      throw new BadGatewayException(
        'Não foi possível gerar o Pix agora. Tente novamente',
      );
    }

    return this.finalizar(compra.id, {
      metodo: MetodoPagamento.pix,
      transacaoId: pix.transacaoId,
      pixCopiaECola: pix.copiaECola,
      expiraEm: pix.expiraEm,
    });
  }

  // Chamado quando o pagamento do Pix chega: num serviço real, pelo webhook
  // do gateway; aqui, pelo botão "Simular pagamento". Só confirma se ainda for
  // aquele mesmo Pix (mesma transação) e se ele não tiver vencido.
  async confirmarPix(compraId: string, transacaoId: string) {
    const { count } = await this.prismaService.compra.updateMany({
      where: {
        id: compraId,
        transacaoId,
        metodo: MetodoPagamento.pix,
        status: StatusCompra.iniciada,
        expiraEm: { gt: new Date() },
      },
      data: { status: StatusCompra.confirmada, expiraEm: null },
    });
    return count > 0;
  }

  // Situação de uma compra do próprio usuário, para o site acompanhar o Pix.
  // Um Pix vencido passa a "falha" aqui mesmo.
  async situacao(usuarioId: string, compraId: string) {
    const compra = await this.prismaService.compra.findFirst({
      where: { id: compraId, usuarioId },
    });
    if (!compra) {
      throw new NotFoundException('Compra não encontrada');
    }

    if (
      compra.status === StatusCompra.iniciada &&
      compra.metodo === MetodoPagamento.pix &&
      compra.expiraEm &&
      compra.expiraEm <= new Date()
    ) {
      await this.prismaService.compra.updateMany({
        where: { id: compraId, status: StatusCompra.iniciada },
        data: { status: StatusCompra.falha, motivoFalha: 'Pix expirado' },
      });
    }

    return this.prismaService.compra.findUniqueOrThrow({
      where: { id: compraId },
      include: incluirLivro,
    });
  }

  // Só no ambiente de teste: faz o papel do banco e "paga" o Pix.
  async simularPagamentoPix(usuarioId: string, compraId: string) {
    if (!this.gateway.permiteSimularPix) {
      throw new NotFoundException('Simulação de pagamento indisponível');
    }
    const compra = await this.situacao(usuarioId, compraId);
    if (compra.metodo !== MetodoPagamento.pix || !compra.transacaoId) {
      throw new BadRequestException('Esta compra não é um pagamento Pix');
    }
    if (compra.status === StatusCompra.confirmada) {
      return compra;
    }
    if (!(await this.confirmarPix(compraId, compra.transacaoId))) {
      throw new BadRequestException(
        compra.motivoFalha === 'Pix expirado'
          ? 'Este Pix expirou. Gere um novo para pagar'
          : 'Este Pix não está mais aguardando pagamento',
      );
    }
    return this.situacao(usuarioId, compraId);
  }

  // Cria a compra como "iniciada" ou reaproveita uma que falhou, foi
  // cancelada, venceu ou é um Pix ainda não pago (o cliente pode desistir do
  // Pix e pagar de outro jeito). A troca de status é feita com uma condição
  // no próprio UPDATE, então duas requisições simultâneas não pagam duas vezes.
  private async reservar(
    usuarioId: string,
    livroId: string,
    valorCentavos: number,
    prazoMs: number,
  ) {
    const existente = await this.prismaService.compra.findUnique({
      where: { usuarioId_livroId: { usuarioId, livroId } },
    });

    const agora = new Date();
    const novaTentativa = {
      status: StatusCompra.iniciada,
      valorCentavos,
      metodo: null,
      transacaoId: null,
      cartaoFinal: null,
      motivoFalha: null,
      pixCopiaECola: null,
      canceladaEm: null,
      expiraEm: new Date(agora.getTime() + prazoMs),
      createdAt: agora,
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
          { status: StatusCompra.iniciada, metodo: MetodoPagamento.pix },
          { status: StatusCompra.iniciada, expiraEm: { lt: agora } },
          // Compras de antes do campo expiraEm existir.
          {
            status: StatusCompra.iniciada,
            expiraEm: null,
            updatedAt: { lt: new Date(agora.getTime() - PRAZO_CARTAO_MS) },
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
