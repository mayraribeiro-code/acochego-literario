import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Put,
  Request,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { FormatoArquivo } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ArquivosService, dispositionDeAnexo } from './arquivos.service';
import { SalvarProgressoDto } from './dtos/progresso';

// Acesso ao conteúdo dos livros comprados. Não existe URL pública do arquivo:
// toda leitura passa pelo token e pela verificação de compra.
@Controller('leitura')
@UseGuards(AuthGuard)
export class LeituraController {
  constructor(private arquivosService: ArquivosService) {}

  @Get(':livroId')
  async formatos(
    @Request() request: AuthenticatedRequest,
    @Param('livroId', ParseUUIDPipe) livroId: string,
  ) {
    return this.arquivosService.formatosParaLeitura(request.user.sub, livroId);
  }

  // As rotas de progresso vêm antes de ":livroId/:formato"; senão "progresso"
  // seria lido como um formato.
  @Get(':livroId/progresso')
  async progresso(
    @Request() request: AuthenticatedRequest,
    @Param('livroId', ParseUUIDPipe) livroId: string,
  ) {
    return this.arquivosService.progresso(request.user.sub, livroId);
  }

  @Put(':livroId/progresso')
  async salvarProgresso(
    @Request() request: AuthenticatedRequest,
    @Param('livroId', ParseUUIDPipe) livroId: string,
    @Body() body: SalvarProgressoDto,
  ) {
    return this.arquivosService.salvarProgresso(
      request.user.sub,
      livroId,
      body,
    );
  }

  @Get(':livroId/:formato')
  @Header('Cache-Control', 'private, no-store')
  async arquivo(
    @Request() request: AuthenticatedRequest,
    @Param('livroId', ParseUUIDPipe) livroId: string,
    @Param('formato', new ParseEnumPipe(FormatoArquivo))
    formato: FormatoArquivo,
  ) {
    const { stream, mimeType, tamanhoBytes } =
      await this.arquivosService.abrirParaLeitura(
        request.user.sub,
        livroId,
        formato,
      );

    return new StreamableFile(stream, {
      type: mimeType,
      length: tamanhoBytes,
      disposition: 'inline',
    });
  }

  // Mesmas regras da leitura, mas entregue como anexo com o nome do livro.
  @Get(':livroId/:formato/download')
  @Header('Cache-Control', 'private, no-store')
  async download(
    @Request() request: AuthenticatedRequest,
    @Param('livroId', ParseUUIDPipe) livroId: string,
    @Param('formato', new ParseEnumPipe(FormatoArquivo))
    formato: FormatoArquivo,
  ) {
    const { stream, mimeType, tamanhoBytes, nomeDownload } =
      await this.arquivosService.abrirParaLeitura(
        request.user.sub,
        livroId,
        formato,
      );

    return new StreamableFile(stream, {
      type: mimeType,
      length: tamanhoBytes,
      disposition: dispositionDeAnexo(nomeDownload),
    });
  }
}
