// Configuração do Prisma (substitui a chave "prisma" do package.json, que
// deixa de funcionar no Prisma 7).
// Com este arquivo o Prisma não lê mais o .env sozinho, por isso o dotenv.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
});
