import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TipoUsuario } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dtos/compra';

// O usuário vem sempre do token, nunca do corpo da requisição:
// assim ninguém compra em nome de outro nem lê a biblioteca de outro.
@Controller('compras')
@UseGuards(AuthGuard, RolesGuard)
export class ComprasController {
  constructor(private comprasService: ComprasService) {}

  @Roles(TipoUsuario.comum)
  @Post()
  async comprar(
    @Request() request: AuthenticatedRequest,
    @Body() body: CreateCompraDto,
  ) {
    return this.comprasService.comprar(
      request.user.sub,
      body.livroId,
      body.metodo,
      body.cartao,
    );
  }

  @Get()
  async minhas(@Request() request: AuthenticatedRequest) {
    return this.comprasService.listarDoUsuario(request.user.sub);
  }

  // Situação de uma compra do próprio usuário: o site consulta enquanto
  // espera o pagamento do Pix.
  @Get(':id')
  async situacao(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.comprasService.situacao(request.user.sub, id);
  }

  // Só com o pagamento simulado: faz o papel do app do banco e paga o Pix.
  @Roles(TipoUsuario.comum)
  @Post(':id/pix/simular-pagamento')
  @HttpCode(200)
  async simularPagamentoPix(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.comprasService.simularPagamentoPix(request.user.sub, id);
  }
}
