import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TipoUsuario } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ComprasService } from './compras.service';
import {
  QueryLimite,
  QueryPagina,
  validarPaginacao,
} from '../common/paginacao';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(TipoUsuario.admin)
export class AdminComprasController {
  constructor(private comprasService: ComprasService) {}

  @Get('compras')
  async listar(@QueryPagina() pagina: number, @QueryLimite() limite: number) {
    return this.comprasService.listarTodas(validarPaginacao(pagina, limite));
  }

  // Estorna o pagamento e tira o livro da biblioteca do cliente.
  @Post('compras/:id/cancelar')
  @HttpCode(200)
  async cancelar(@Param('id', ParseUUIDPipe) id: string) {
    return this.comprasService.cancelar(id);
  }

  // Números do topo do painel administrativo.
  @Get('resumo')
  async resumo() {
    return this.comprasService.resumo();
  }
}
