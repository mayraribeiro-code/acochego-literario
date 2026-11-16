import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Roda uma vez antes de todos os testes: apaga o banco de testes
// (prisma/test.db) e o recria aplicando as migrations, sem o seed.
// "migrate deploy" nunca apaga dados, então mesmo um erro de configuração
// não teria como afetar o banco de desenvolvimento (prisma/dev.db).
export default function globalSetup() {
  const raiz = join(__dirname, '..');
  for (const arquivo of ['test.db', 'test.db-journal']) {
    rmSync(join(raiz, 'prisma', arquivo), { force: true });
  }

  execSync('npx prisma migrate deploy', {
    cwd: raiz,
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    stdio: 'ignore',
  });

  rmSync(join(tmpdir(), 'livraria-api-testes'), {
    recursive: true,
    force: true,
  });
}
