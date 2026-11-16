import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FormatoArquivo, StatusCompra } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';

export const TAMANHO_MAXIMO_BYTES = 50 * 1024 * 1024;

const TIPOS: Record<FormatoArquivo, { extensao: string; mimeType: string }> = {
  PDF: { extensao: 'pdf', mimeType: 'application/pdf' },
  EPUB: { extensao: 'epub', mimeType: 'application/epub+zip' },
};

// Descobre o formato pelo conteúdo do arquivo, não pelo nome ou pelo
// Content-Type enviados, que o cliente pode inventar.
function detectarFormato(conteudo: Buffer): FormatoArquivo | null {
  if (conteudo.subarray(0, 5).toString('latin1') === '%PDF-') {
    return FormatoArquivo.PDF;
  }
  // EPUB é um ZIP cujo primeiro arquivo é "mimetype" com "application/epub+zip".
  const ehZip = conteudo.subarray(0, 4).toString('latin1') === 'PK\x03\x04';
  const cabecalho = conteudo.subarray(30, 58).toString('latin1');
  if (ehZip && cabecalho === 'mimetypeapplication/epub+zip') {
    return FormatoArquivo.EPUB;
  }
  return null;
}

@Injectable()
export class ArquivosService {
  private pasta: string;

  constructor(
    private prismaService: PrismaService,
    configService: ConfigService,
  ) {
    this.pasta = resolve(configService.get<string>('STORAGE_DIR', './storage'));
  }

  listar(livroId: string) {
    return this.prismaService.arquivoDigital.findMany({
      where: { livroId },
      orderBy: { formato: 'asc' },
    });
  }

  // Envia (ou substitui) o arquivo de um formato do livro.
  async salvar(livroId: string, arquivo: Express.Multer.File | undefined) {
    if (!arquivo) {
      throw new BadRequestException('Envie o arquivo no campo "arquivo"');
    }

    const livro = await this.prismaService.livro.findUnique({
      where: { id: livroId },
    });
    if (!livro) {
      throw new NotFoundException('Livro não encontrado');
    }

    const formato = detectarFormato(arquivo.buffer);
    if (!formato) {
      throw new BadRequestException('O arquivo precisa ser um PDF ou EPUB');
    }

    const caminho = `${randomUUID()}.${TIPOS[formato].extensao}`;
    await mkdir(this.pasta, { recursive: true });
    await writeFile(join(this.pasta, caminho), arquivo.buffer);

    const anterior = await this.prismaService.arquivoDigital.findUnique({
      where: { livroId_formato: { livroId, formato } },
    });

    const dados = {
      nomeOriginal: arquivo.originalname,
      caminho,
      tamanhoBytes: arquivo.size,
    };
    const salvo = await this.prismaService.arquivoDigital.upsert({
      where: { livroId_formato: { livroId, formato } },
      create: { livroId, formato, ...dados },
      update: dados,
    });

    if (anterior) {
      await rm(join(this.pasta, anterior.caminho), { force: true });
    }

    return salvo;
  }

  async remover(livroId: string, formato: FormatoArquivo) {
    const arquivo = await this.prismaService.arquivoDigital.findUnique({
      where: { livroId_formato: { livroId, formato } },
    });
    if (!arquivo) {
      throw new NotFoundException('Arquivo não encontrado');
    }

    await this.prismaService.arquivoDigital.delete({
      where: { id: arquivo.id },
    });
    await rm(join(this.pasta, arquivo.caminho), { force: true });
  }

  // Regra da biblioteca: só lê quem tem compra confirmada do livro.
  private async garantirQuePossui(usuarioId: string, livroId: string) {
    const compra = await this.prismaService.compra.findUnique({
      where: { usuarioId_livroId: { usuarioId, livroId } },
    });
    if (!compra || compra.status !== StatusCompra.confirmada) {
      throw new ForbiddenException('Você não possui este livro');
    }
  }

  async formatosParaLeitura(usuarioId: string, livroId: string) {
    await this.garantirQuePossui(usuarioId, livroId);

    const arquivos = await this.listar(livroId);
    return { formatos: arquivos.map((a) => a.formato) };
  }

  async abrirParaLeitura(
    usuarioId: string,
    livroId: string,
    formato: FormatoArquivo,
  ) {
    await this.garantirQuePossui(usuarioId, livroId);

    const arquivo = await this.prismaService.arquivoDigital.findUnique({
      where: { livroId_formato: { livroId, formato } },
      include: { livro: { select: { titulo: true } } },
    });
    if (!arquivo) {
      throw new NotFoundException(
        'O arquivo deste livro ainda não está disponível',
      );
    }

    return {
      stream: createReadStream(join(this.pasta, arquivo.caminho)),
      mimeType: TIPOS[formato].mimeType,
      tamanhoBytes: arquivo.tamanhoBytes,
      nomeDownload: `${arquivo.livro.titulo}.${TIPOS[formato].extensao}`,
    };
  }
}

// Content-Disposition de anexo com o nome do livro. "filename" leva uma versão
// só com ASCII (navegadores antigos); "filename*" leva o nome com acentos.
export function dispositionDeAnexo(nome: string) {
  const ascii = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.\- ]/g, '')
    .trim();
  return `attachment; filename="${ascii || 'livro'}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}
