import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLivroDto, UpdateLivroDto } from './dtos/livro';

const incluirAutorEGenero = { autor: true, genero: true } as const;

@Injectable()
export class LivrosService {
  constructor(private prismaService: PrismaService) {}

  listarAtivos() {
    return this.prismaService.livro.findMany({
      where: { ativo: true },
      include: incluirAutorEGenero,
      orderBy: { createdAt: 'asc' },
    });
  }

  async buscarAtivo(id: string) {
    const livro = await this.prismaService.livro.findFirst({
      where: { id, ativo: true },
      include: incluirAutorEGenero,
    });

    if (!livro) {
      throw new NotFoundException('Livro não encontrado');
    }

    return livro;
  }

  // Só gêneros que têm livros no catálogo, para o filtro não oferecer opções vazias.
  listarGeneros() {
    return this.prismaService.genero.findMany({
      where: { livros: { some: { ativo: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  listarTodos() {
    return this.prismaService.livro.findMany({
      include: incluirAutorEGenero,
      orderBy: { createdAt: 'asc' },
    });
  }

  criar(data: CreateLivroDto) {
    const { autor, genero, ...livro } = data;

    return this.prismaService.livro.create({
      data: {
        ...livro,
        autor: this.conectarPorNome(autor),
        genero: this.conectarPorNome(genero),
      },
      include: incluirAutorEGenero,
    });
  }

  async atualizar(id: string, data: UpdateLivroDto) {
    const existente = await this.prismaService.livro.findUnique({
      where: { id },
    });

    if (!existente) {
      throw new NotFoundException('Livro não encontrado');
    }

    const { autor, genero, ...livro } = data;

    return this.prismaService.livro.update({
      where: { id },
      data: {
        ...livro,
        ...(autor && { autor: this.conectarPorNome(autor) }),
        ...(genero && { genero: this.conectarPorNome(genero) }),
      },
      include: incluirAutorEGenero,
    });
  }

  // Reaproveita o autor/gênero com o mesmo nome em vez de duplicar.
  private conectarPorNome(nome: string) {
    const nomeLimpo = nome.trim();
    return {
      connectOrCreate: {
        where: { nome: nomeLimpo },
        create: { nome: nomeLimpo },
      },
    };
  }
}
