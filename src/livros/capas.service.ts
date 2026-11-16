import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { mkdir, rm, stat, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';

export const TAMANHO_MAXIMO_CAPA = 2 * 1024 * 1024;

const TIPOS_DE_IMAGEM = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;
type Extensao = keyof typeof TIPOS_DE_IMAGEM;

// Descobre o tipo pelo conteúdo, não pelo nome nem pelo Content-Type enviados.
function detectarImagem(conteudo: Buffer): Extensao | null {
  if (conteudo.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'jpg';
  }
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (conteudo.subarray(0, 8).equals(png)) return 'png';
  if (
    conteudo.subarray(0, 4).toString('latin1') === 'RIFF' &&
    conteudo.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

// Capas são públicas (aparecem no catálogo), ao contrário dos arquivos dos
// livros. Ficam em STORAGE_DIR/capas com nome gerado pela API; trocar a capa
// gera um nome novo, e o site usa esse nome na URL para não mostrar a antiga
// guardada em cache.
@Injectable()
export class CapasService {
  private pasta: string;

  constructor(
    private prismaService: PrismaService,
    configService: ConfigService,
  ) {
    this.pasta = join(
      resolve(configService.get<string>('STORAGE_DIR', './storage')),
      'capas',
    );
  }

  async salvar(livroId: string, arquivo: Express.Multer.File | undefined) {
    if (!arquivo) {
      throw new BadRequestException('Envie a imagem no campo "capa"');
    }
    const livro = await this.buscarLivro(livroId);

    const extensao = detectarImagem(arquivo.buffer);
    if (!extensao) {
      throw new BadRequestException('A capa precisa ser JPG, PNG ou WebP');
    }

    const nome = `${randomUUID()}.${extensao}`;
    await mkdir(this.pasta, { recursive: true });
    await writeFile(join(this.pasta, nome), arquivo.buffer);

    const atualizado = await this.prismaService.livro.update({
      where: { id: livroId },
      data: { capaArquivo: nome },
      include: { autor: true, genero: true },
    });
    if (livro.capaArquivo) {
      await rm(join(this.pasta, livro.capaArquivo), { force: true });
    }
    return atualizado;
  }

  async remover(livroId: string) {
    const livro = await this.buscarLivro(livroId);
    if (!livro.capaArquivo) {
      throw new NotFoundException('Este livro não tem imagem de capa');
    }
    const atualizado = await this.prismaService.livro.update({
      where: { id: livroId },
      data: { capaArquivo: null },
      include: { autor: true, genero: true },
    });
    await rm(join(this.pasta, livro.capaArquivo), { force: true });
    return atualizado;
  }

  async abrir(livroId: string) {
    const livro = await this.prismaService.livro.findUnique({
      where: { id: livroId },
      select: { capaArquivo: true },
    });
    if (!livro?.capaArquivo) {
      throw new NotFoundException('Este livro não tem imagem de capa');
    }
    const caminho = join(this.pasta, livro.capaArquivo);
    const { size } = await stat(caminho).catch(() => {
      throw new NotFoundException('Imagem de capa não encontrada');
    });
    const extensao = livro.capaArquivo.split('.').pop() as Extensao;
    return {
      stream: createReadStream(caminho),
      mimeType: TIPOS_DE_IMAGEM[extensao],
      tamanhoBytes: size,
    };
  }

  private async buscarLivro(livroId: string) {
    const livro = await this.prismaService.livro.findUnique({
      where: { id: livroId },
    });
    if (!livro) {
      throw new NotFoundException('Livro não encontrado');
    }
    return livro;
  }
}
