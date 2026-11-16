import { tmpdir } from 'os';
import { join } from 'path';

// Variáveis dos testes. Vêm antes do .env: o ConfigModule e o Prisma não
// sobrescrevem o que já está definido, então os testes nunca tocam no banco
// de desenvolvimento (prisma/dev.db) nem na pasta storage/.
export const DATABASE_URL_TESTE = 'file:./test.db';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = DATABASE_URL_TESTE;
process.env.JWT_SECRET = 'segredo-dos-testes-com-pelo-menos-32-caracteres';
process.env.JWT_EXPIRES_IN = '1h';
process.env.STORAGE_DIR = join(tmpdir(), 'livraria-api-testes');
