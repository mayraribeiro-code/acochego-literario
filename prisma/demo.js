// Dados de demonstração para a apresentação do site.
// Roda com `npm run demo` (depois do seed, que cria o admin e o catálogo).
//
// Cria clientes, compras (aprovadas, uma recusada e uma cancelada),
// avaliações, progresso de leitura e os arquivos dos livros em domínio
// público. Pode rodar quantas vezes quiser: apaga os clientes de demonstração
// (emails @demo.com) e tudo o que eles fizeram, e cria tudo de novo. O admin,
// o catálogo e qualquer outro usuário não são tocados.
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const { copyFile, mkdir, rm, stat } = require('fs/promises');
const { join, resolve } = require('path');

const prisma = new PrismaClient();
const PASTA_ARQUIVOS = resolve(process.env.STORAGE_DIR || './storage');
const PASTA_LIVROS = join(__dirname, 'demo', 'livros');
const PASTA_CAPAS_DEMO = join(__dirname, 'demo', 'capas');
const PASTA_CAPAS = join(PASTA_ARQUIVOS, 'capas');

const SENHA_DEMO = 'demo1234';
const DOMINIO = '@demo.com';

// Arquivos dos livros em domínio público (ver prisma/demo/livros/FONTES.md).
// "formato" corrige o texto do catálogo para o que de fato existe.
const ARQUIVOS = [
  {
    titulo: 'Dom Casmurro',
    capa: 'dom-casmurro.jpg',
    formato: 'PDF + EPUB',
    arquivos: [
      { formato: 'PDF', nome: 'dom-casmurro.pdf' },
      { formato: 'EPUB', nome: 'dom-casmurro.epub' },
    ],
  },
  {
    titulo: 'Memórias Póstumas de Brás Cubas',
    capa: 'memorias-postumas-de-bras-cubas.jpg',
    formato: 'PDF + EPUB',
    arquivos: [
      { formato: 'PDF', nome: 'memorias-postumas-de-bras-cubas.pdf' },
      { formato: 'EPUB', nome: 'memorias-postumas-de-bras-cubas.epub' },
    ],
  },
  {
    titulo: 'O Cortiço',
    capa: 'o-cortico.jpg',
    formato: 'PDF + EPUB',
    arquivos: [
      { formato: 'PDF', nome: 'o-cortico.pdf' },
      { formato: 'EPUB', nome: 'o-cortico.epub' },
    ],
  },
];

// Ana é a conta para usar na apresentação. Ela já tem Dom Casmurro (com
// leitura em andamento) e O Cortiço, mas não Memórias Póstumas: assim dá
// para mostrar uma compra ao vivo e abrir o livro em seguida.
const CLIENTES = [
  { nome: 'Ana Souza', email: 'ana' },
  { nome: 'Bruno Lima', email: 'bruno' },
  { nome: 'Carla Mendes', email: 'carla' },
  { nome: 'Diego Rocha', email: 'diego' },
  { nome: 'Elisa Martins', email: 'elisa' },
  { nome: 'Felipe Costa', email: 'felipe' },
];

// [cliente, livro, dias atrás, status]. "falha" e "cancelada" aparecem no painel.
const COMPRAS = [
  ['ana', 'Dom Casmurro', 20, 'confirmada'],
  ['ana', 'O Cortiço', 6, 'confirmada'],
  ['bruno', 'Dom Casmurro', 18, 'confirmada'],
  ['bruno', 'Crime e Castigo', 15, 'confirmada'],
  ['bruno', 'Grande Sertão: Veredas', 4, 'falha'],
  ['carla', 'Dom Casmurro', 14, 'confirmada'],
  ['carla', 'A Hora da Estrela', 12, 'confirmada'],
  ['carla', 'Vidas Secas', 9, 'confirmada'],
  ['diego', '1984', 11, 'confirmada'],
  ['diego', 'Cem Anos de Solidão', 8, 'confirmada'],
  ['diego', 'O Alquimista', 7, 'cancelada'],
  ['elisa', 'Memórias Póstumas de Brás Cubas', 10, 'confirmada'],
  ['elisa', 'O Cortiço', 5, 'confirmada'],
  ['elisa', 'Gabriela, Cravo e Canela', 3, 'confirmada'],
  ['felipe', '1984', 6, 'confirmada'],
  ['felipe', 'Memórias Póstumas de Brás Cubas', 2, 'confirmada'],
  ['felipe', 'Dom Casmurro', 1, 'confirmada'],
];

// Compras pagas com Pix (as demais, com cartão).
const PAGOS_COM_PIX = new Set([
  'elisa|Gabriela, Cravo e Canela',
  'carla|Vidas Secas',
  'felipe|Memórias Póstumas de Brás Cubas',
]);

// [cliente, livro, nota, comentário]. Só de compras confirmadas.
const AVALIACOES = [
  ['bruno', 'Dom Casmurro', 5, 'Releio de tempos em tempos e sempre mudo de opinião sobre a Capitu. Genial.'],
  ['carla', 'Dom Casmurro', 4, 'Narrador nada confiável, do jeito que tem que ser. Só achei o começo um pouco lento.'],
  ['felipe', 'Dom Casmurro', 5, null],
  ['bruno', 'Crime e Castigo', 5, 'Denso, mas impossível de largar. A tensão psicológica é absurda.'],
  ['carla', 'A Hora da Estrela', 4, 'Curtinho e devastador. A Macabéa fica com a gente por dias.'],
  ['carla', 'Vidas Secas', 5, 'O capítulo da Baleia é uma das coisas mais tristes que já li.'],
  ['diego', '1984', 5, 'Assustador como continua atual.'],
  ['felipe', '1984', 4, 'Clássico obrigatório. O final é pesado.'],
  ['diego', 'Cem Anos de Solidão', 4, 'Precisei anotar a árvore genealógica, mas valeu cada página.'],
  ['elisa', 'Memórias Póstumas de Brás Cubas', 5, 'Um defunto autor com mais humor do que muito vivo por aí.'],
  ['felipe', 'Memórias Póstumas de Brás Cubas', 4, 'Os capítulos curtinhos deixam a leitura muito fluida.'],
  ['elisa', 'O Cortiço', 4, 'Retrato cru do Rio do século XIX. O cortiço quase vira um personagem.'],
  ['elisa', 'Gabriela, Cravo e Canela', 5, 'Leitura deliciosa, cheia de cheiro e cor da Bahia.'],
];

const diasAtras = (dias) => new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

async function livroPorTitulo(titulo) {
  const livro = await prisma.livro.findFirst({ where: { titulo } });
  if (!livro) {
    throw new Error(
      `Livro "${titulo}" não encontrado. Rode o seed antes: npx prisma db seed`,
    );
  }
  return livro;
}

async function limpar() {
  const contas = await prisma.conta.findMany({
    where: { email: { endsWith: DOMINIO } },
    select: { id: true },
  });
  // Apagar a conta apaga o usuário e, em cascata, compras, avaliações e progresso.
  await prisma.conta.deleteMany({
    where: { id: { in: contas.map((c) => c.id) } },
  });
  console.log(`Removidos ${contas.length} cliente(s) de demonstração anteriores.`);
}

// Mesmo resultado do upload pelo painel: arquivo com nome gerado na pasta
// STORAGE_DIR e registro no banco; reenviar substitui o anterior.
async function cadastrarArquivos() {
  await mkdir(PASTA_ARQUIVOS, { recursive: true });
  await mkdir(PASTA_CAPAS, { recursive: true });

  for (const item of ARQUIVOS) {
    const livro = await livroPorTitulo(item.titulo);

    // Capa: folha de rosto da edição original, tirada do EPUB do Gutenberg.
    const capa = `${randomUUID()}.jpg`;
    await copyFile(join(PASTA_CAPAS_DEMO, item.capa), join(PASTA_CAPAS, capa));
    await prisma.livro.update({
      where: { id: livro.id },
      data: { formato: item.formato, capaArquivo: capa },
    });
    if (livro.capaArquivo) {
      await rm(join(PASTA_CAPAS, livro.capaArquivo), { force: true });
    }

    for (const { formato, nome } of item.arquivos) {
      const origem = join(PASTA_LIVROS, nome);
      const caminho = `${randomUUID()}.${formato.toLowerCase()}`;
      await copyFile(origem, join(PASTA_ARQUIVOS, caminho));
      const { size } = await stat(origem);

      const anterior = await prisma.arquivoDigital.findUnique({
        where: { livroId_formato: { livroId: livro.id, formato } },
      });
      const dados = { nomeOriginal: nome, caminho, tamanhoBytes: size };
      await prisma.arquivoDigital.upsert({
        where: { livroId_formato: { livroId: livro.id, formato } },
        create: { livroId: livro.id, formato, ...dados },
        update: dados,
      });
      if (anterior) {
        await rm(join(PASTA_ARQUIVOS, anterior.caminho), { force: true });
      }
    }
  }
  console.log('Arquivos e capas dos livros em domínio público cadastrados.');
}

async function criarClientes() {
  const senhaHash = await bcrypt.hash(SENHA_DEMO, 10);
  const ids = {};
  for (const { nome, email } of CLIENTES) {
    const usuario = await prisma.usuario.create({
      data: {
        nome,
        conta: { create: { email: `${email}${DOMINIO}`, senhaHash } },
      },
    });
    ids[email] = usuario.id;
  }
  return ids;
}

async function criarCompras(clientes) {
  for (const [cliente, titulo, dias, status] of COMPRAS) {
    const livro = await livroPorTitulo(titulo);
    const quando = diasAtras(dias);
    await prisma.compra.create({
      data: {
        usuarioId: clientes[cliente],
        livroId: livro.id,
        valorCentavos: livro.precoCentavos,
        status,
        createdAt: quando,
        metodo: PAGOS_COM_PIX.has(`${cliente}|${titulo}`) ? 'pix' : 'cartao',
        ...(status !== 'falha' &&
          !PAGOS_COM_PIX.has(`${cliente}|${titulo}`) && {
            transacaoId: `sim_demo_${randomUUID()}`,
            cartaoFinal: '4242',
          }),
        ...(PAGOS_COM_PIX.has(`${cliente}|${titulo}`) && {
          transacaoId: `sim_pix_demo_${randomUUID()}`,
        }),
        ...(status === 'falha' && {
          cartaoFinal: '0002',
          motivoFalha: 'Pagamento recusado pelo banco emissor',
        }),
        ...(status === 'cancelada' && { canceladaEm: diasAtras(dias - 1) }),
      },
    });
  }
}

async function criarAvaliacoes(clientes) {
  for (const [cliente, titulo, nota, comentario] of AVALIACOES) {
    const livro = await livroPorTitulo(titulo);
    // Datada um dia depois da compra (ou hoje, se a compra foi ontem).
    const [, , dias] = COMPRAS.find(([c, t]) => c === cliente && t === titulo);
    const quando = diasAtras(Math.max(dias - 1, 0));
    await prisma.avaliacao.create({
      data: {
        usuarioId: clientes[cliente],
        livroId: livro.id,
        nota,
        comentario,
        createdAt: quando,
        updatedAt: quando,
      },
    });
  }

  // Média e total de todos os livros, como a API faz a cada avaliação.
  for (const { id } of await prisma.livro.findMany({ select: { id: true } })) {
    const { _avg, _count } = await prisma.avaliacao.aggregate({
      where: { livroId: id },
      _avg: { nota: true },
      _count: true,
    });
    await prisma.livro.update({
      where: { id },
      data: {
        avaliacao: Math.round((_avg.nota ?? 0) * 10) / 10,
        totalAvaliacoes: _count,
      },
    });
  }
}

// Ana parou na página 34 do PDF de Dom Casmurro: "Continuar lendo" já
// abre ali.
async function criarProgresso(clientes) {
  const livro = await livroPorTitulo('Dom Casmurro');
  await prisma.progressoLeitura.create({
    data: {
      usuarioId: clientes.ana,
      livroId: livro.id,
      formato: 'PDF',
      posicao: '34',
      percentual: 28,
    },
  });
}

async function main() {
  await limpar();
  await cadastrarArquivos();
  const clientes = await criarClientes();
  await criarCompras(clientes);
  await criarAvaliacoes(clientes);
  await criarProgresso(clientes);

  console.log(
    `Pronto: ${CLIENTES.length} clientes, ${COMPRAS.length} compras e ${AVALIACOES.length} avaliações.`,
  );
  console.log(`Entre como ana${DOMINIO} com a senha ${SENHA_DEMO}.`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
