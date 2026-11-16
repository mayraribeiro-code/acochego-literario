import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { LivrosService } from './livros.service';

// Rotas públicas do catálogo: visitantes podem navegar sem login.
@Controller('livros')
export class LivrosController {
  constructor(private livrosService: LivrosService) {}

  @Get()
  async listar() {
    return this.livrosService.listarAtivos();
  }

  @Get('generos')
  async listarGeneros() {
    return this.livrosService.listarGeneros();
  }

  @Get(':id')
  async buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.livrosService.buscarAtivo(id);
  }
}
