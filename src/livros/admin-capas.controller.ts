import {
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TipoUsuario } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CapasService, TAMANHO_MAXIMO_CAPA } from './capas.service';

@Controller('admin/livros/:livroId/capa')
@UseGuards(AuthGuard, RolesGuard)
@Roles(TipoUsuario.admin)
export class AdminCapasController {
  constructor(private capasService: CapasService) {}

  // multipart/form-data com a imagem no campo "capa" (JPG, PNG ou WebP, até 2 MB).
  // Devolve o livro atualizado; reenviar substitui a capa anterior.
  @Post()
  @UseInterceptors(
    FileInterceptor('capa', { limits: { fileSize: TAMANHO_MAXIMO_CAPA } }),
  )
  async enviar(
    @Param('livroId', ParseUUIDPipe) livroId: string,
    @UploadedFile() capa: Express.Multer.File | undefined,
  ) {
    return this.capasService.salvar(livroId, capa);
  }

  // Volta a usar a capa desenhada com as cores do livro.
  @Delete()
  async remover(@Param('livroId', ParseUUIDPipe) livroId: string) {
    return this.capasService.remover(livroId);
  }
}
