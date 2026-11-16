import { INestApplication, ValidationPipe } from '@nestjs/common';

// Configuração comum da aplicação, usada pelo main.ts e pelos testes e2e,
// para os testes rodarem com as mesmas regras da API de verdade.
export function configurarApp(app: INestApplication) {
  // whitelist descarta campos que não estão no DTO (ex.: "avaliacao" no PATCH de livro).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
}
