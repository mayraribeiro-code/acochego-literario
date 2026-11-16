import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  StreamableFile,
} from '@nestjs/common';
import { LivrosService } from './livros.service';
import { CapasService } from './capas.service';

// Rotas públicas do catálogo: visitantes podem navegar sem login.
@Controller('livros')
export class LivrosController {
  constructor(
    private livrosService: LivrosService,
    private capasService: CapasService,
  ) {}

  @Get()
  async listar() {
    return this.livrosService.listarAtivos();
  }

  @Get('generos')
  async listarGeneros() {
    return this.livrosService.listarGeneros();
  }

  // A URL usada pelo site leva o nome do arquivo (?v=...), que muda a cada
  // troca de capa; por isso a imagem pode ficar em cache por muito tempo.
  @Get(':id/capa')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async capa(@Param('id', ParseUUIDPipe) id: string) {
    const { stream, mimeType, tamanhoBytes } =
      await this.capasService.abrir(id);
    return new StreamableFile(stream, { type: mimeType, length: tamanhoBytes });
  }

  @Get(':id')
  async buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.livrosService.buscarAtivo(id);
  }
}
