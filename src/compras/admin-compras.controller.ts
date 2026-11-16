import { Controller, Get, UseGuards } from '@nestjs/common';
import { TipoUsuario } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ComprasService } from './compras.service';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(TipoUsuario.admin)
export class AdminComprasController {
  constructor(private comprasService: ComprasService) {}

  @Get('compras')
  async listar() {
    return this.comprasService.listarTodas();
  }

  // Números do topo do painel administrativo.
  @Get('resumo')
  async resumo() {
    return this.comprasService.resumo();
  }
}
