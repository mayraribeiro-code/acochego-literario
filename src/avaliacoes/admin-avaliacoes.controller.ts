import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { TipoUsuario } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AvaliacoesService } from './avaliacoes.service';

// Moderação: o admin pode apagar avaliações impróprias de qualquer livro.
@Controller('admin/avaliacoes')
@UseGuards(AuthGuard, RolesGuard)
@Roles(TipoUsuario.admin)
export class AdminAvaliacoesController {
  constructor(private avaliacoesService: AvaliacoesService) {}

  @Delete(':id')
  @HttpCode(204)
  async remover(@Param('id', ParseUUIDPipe) id: string) {
    await this.avaliacoesService.removerPorId(id);
  }
}
