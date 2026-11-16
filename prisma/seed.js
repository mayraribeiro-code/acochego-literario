// Seed inicial: cria o usuário administrador e o catálogo de livros.
// Roda com `npx prisma db seed` (e automaticamente após `npx prisma migrate dev` / `migrate reset`).
// Pode rodar várias vezes: o que já existe não é duplicado.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const catalogo = require('./catalogo');

const prisma = new PrismaClient();

async function criarAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@livraria.com';
  const senha = process.env.ADMIN_PASSWORD || 'admin123';

  const contaExistente = await prisma.conta.findUnique({ where: { email } });

  if (contaExistente) {
    console.log(`Admin ${email} já existe, nada a fazer.`);
    return;
  }

  await prisma.usuario.create({
    data: {
      nome: 'Administrador',
      tipoUsuario: 'admin',
      conta: {
        create: {
          email,
          senhaHash: await bcrypt.hash(senha, 10),
        },
      },
    },
  });

  console.log(`Admin criado: ${email}`);
}

async function criarCatalogo() {
  let criados = 0;

  for (const { autor, genero, ...livro } of catalogo) {
    const existente = await prisma.livro.findFirst({
      where: { titulo: livro.titulo },
    });
    if (existente) continue;

    await prisma.livro.create({
      data: {
        ...livro,
        autor: {
          connectOrCreate: { where: { nome: autor }, create: { nome: autor } },
        },
        genero: {
          connectOrCreate: { where: { nome: genero }, create: { nome: genero } },
        },
      },
    });
    criados++;
  }

  console.log(`Catálogo: ${criados} livro(s) criado(s).`);
}

async function main() {
  await criarAdmin();
  await criarCatalogo();
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
