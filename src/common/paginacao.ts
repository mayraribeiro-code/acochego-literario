import {
  BadRequestException,
  DefaultValuePipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';

export const LIMITE_PADRAO = 20;
export const LIMITE_MAXIMO = 100;

export interface Paginacao {
  pagina: number;
  limite: number;
}

// Resposta das listas paginadas: os itens da página e o total de itens da lista.
export interface Pagina<T> extends Paginacao {
  itens: T[];
  total: number;
}

// Lê "?pagina=" e "?limite=" da URL; quando faltam, valem 1 e LIMITE_PADRAO.
export const QueryPagina = () =>
  Query('pagina', new DefaultValuePipe(1), ParseIntPipe);
export const QueryLimite = () =>
  Query('limite', new DefaultValuePipe(LIMITE_PADRAO), ParseIntPipe);

export function validarPaginacao(pagina: number, limite: number): Paginacao {
  if (pagina < 1) {
    throw new BadRequestException('A página deve ser 1 ou maior');
  }
  if (limite < 1 || limite > LIMITE_MAXIMO) {
    throw new BadRequestException(
      `O limite deve ficar entre 1 e ${LIMITE_MAXIMO}`,
    );
  }
  return { pagina, limite };
}

// skip/take do Prisma para a página pedida.
export function skipTake({ pagina, limite }: Paginacao) {
  return { skip: (pagina - 1) * limite, take: limite };
}
