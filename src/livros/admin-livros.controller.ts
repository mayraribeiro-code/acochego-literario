import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TipoUsuario } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LivrosService } from './livros.service';
import { CreateLivroDto, UpdateLivroDto } from './dtos/livro';

// Livros não são apagados: para tirar do catálogo, envie { "ativo": false } no PATCH.
@Controller('admin/livros')
@UseGuards(AuthGuard, RolesGuard)
@Roles(TipoUsuario.admin)
export class AdminLivrosController {
  constructor(private livrosService: LivrosService) {}

  @Get()
  async listar() {
    return this.livrosService.listarTodos();
  }

  @Post()
  async criar(@Body() body: CreateLivroDto) {
    return this.livrosService.criar(body);
  }

  @Patch(':id')
  async atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateLivroDto,
  ) {
    return this.livrosService.atualizar(id, body);
  }
}
