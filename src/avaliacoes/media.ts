import { Prisma } from '@prisma/client';

// Recalcula a média (com uma casa decimal, ex.: 4.3) e o total de avaliações
// guardados no livro, para o catálogo não precisar calcular a cada listagem.
// Recebe a transação de quem mudou as avaliações.
export async function recalcularMediaDoLivro(
  tx: Prisma.TransactionClient,
  livroId: string,
) {
  const { _avg, _count } = await tx.avaliacao.aggregate({
    where: { livroId },
    _avg: { nota: true },
    _count: true,
  });

  await tx.livro.update({
    where: { id: livroId },
    data: {
      avaliacao: Math.round((_avg.nota ?? 0) * 10) / 10,
      totalAvaliacoes: _count,
    },
  });
}
