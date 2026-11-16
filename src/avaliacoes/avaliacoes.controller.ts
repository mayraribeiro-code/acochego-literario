import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TipoUsuario } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AvaliacoesService } from './avaliacoes.service';
import { SalvarAvaliacaoDto } from './dtos/avaliacao';
import {
  QueryLimite,
  QueryPagina,
  validarPaginacao,
} from '../common/paginacao';

// A lista é pública; "minha" é sempre a avaliação do usuário do token.
@Controller('livros/:livroId/avaliacoes')
export class AvaliacoesController {
  constructor(private avaliacoesService: AvaliacoesService) {}

  @Get()
  async listar(
    @Param('livroId', ParseUUIDPipe) livroId: string,
    @QueryPagina() pagina: number,
    @QueryLimite() limite: number,
  ) {
    return this.avaliacoesService.listarDoLivro(
      livroId,
      validarPaginacao(pagina, limite),
    );
  }

  @UseGuards(AuthGuard)
  @Get('minha')
  async minha(
    @Request() request: AuthenticatedRequest,
    @Param('livroId', ParseUUIDPipe) livroId: string,
  ) {
    // Embrulhado num objeto: um null puro chegaria como corpo vazio.
    return {
      avaliacao: await this.avaliacoesService.minha(request.user.sub, livroId),
    };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(TipoUsuario.comum)
  @Put('minha')
  async salvar(
    @Request() request: AuthenticatedRequest,
    @Param('livroId', ParseUUIDPipe) livroId: string,
    @Body() body: SalvarAvaliacaoDto,
  ) {
    return this.avaliacoesService.salvar(request.user.sub, livroId, body);
  }

  @UseGuards(AuthGuard)
  @Delete('minha')
  @HttpCode(204)
  async remover(
    @Request() request: AuthenticatedRequest,
    @Param('livroId', ParseUUIDPipe) livroId: string,
  ) {
    await this.avaliacoesService.removerMinha(request.user.sub, livroId);
  }
}
