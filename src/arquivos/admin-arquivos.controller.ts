import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FormatoArquivo, TipoUsuario } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ArquivosService, TAMANHO_MAXIMO_BYTES } from './arquivos.service';

@Controller('admin/livros/:livroId/arquivos')
@UseGuards(AuthGuard, RolesGuard)
@Roles(TipoUsuario.admin)
export class AdminArquivosController {
  constructor(private arquivosService: ArquivosService) {}

  @Get()
  async listar(@Param('livroId', ParseUUIDPipe) livroId: string) {
    return this.arquivosService.listar(livroId);
  }

  // multipart/form-data com o arquivo no campo "arquivo".
  // O formato (PDF ou EPUB) é detectado pelo conteúdo; reenviar substitui o anterior.
  @Post()
  @UseInterceptors(
    FileInterceptor('arquivo', { limits: { fileSize: TAMANHO_MAXIMO_BYTES } }),
  )
  async enviar(
    @Param('livroId', ParseUUIDPipe) livroId: string,
    @UploadedFile() arquivo: Express.Multer.File | undefined,
  ) {
    return this.arquivosService.salvar(livroId, arquivo);
  }

  @Delete(':formato')
  @HttpCode(204)
  async remover(
    @Param('livroId', ParseUUIDPipe) livroId: string,
    @Param('formato', new ParseEnumPipe(FormatoArquivo))
    formato: FormatoArquivo,
  ) {
    await this.arquivosService.remover(livroId, formato);
  }
}
