import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TipoUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export const SENHA = 'senha-de-teste';

// Cartões do gateway simulado (ver src/pagamentos/gateway-simulado.ts).
export const cartao = (numero = '4242424242424242') => ({
  numero,
  nomeTitular: 'Leitora de Teste',
  mesValidade: 12,
  anoValidade: new Date().getFullYear() + 3,
  cvv: '123',
});

export async function criarApp() {
  const modulo = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = modulo.createNestApplication();
  configurarApp(app);
  await app.init();
  return app;
}

export function http(app: INestApplication) {
  return request(app.getHttpServer() as App);
}

export function prismaDe(app: INestApplication) {
  return app.get(PrismaService, { strict: false });
}

export const bearer = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const emailUnico = () => `${randomUUID()}@teste.com`;

export async function cadastrarCliente(app: INestApplication, nome = 'Ana') {
  const email = emailUnico();
  const res = await http(app)
    .post('/auth/signup')
    .send({ name: nome, email, password: SENHA })
    .expect(201);
  return { email, token: (res.body as { accessToken: string }).accessToken };
}

// O admin não se cadastra pela API: é criado direto no banco, como no seed.
export async function criarAdmin(app: INestApplication) {
  const email = emailUnico();
  await prismaDe(app).usuario.create({
    data: {
      nome: 'Admin',
      tipoUsuario: TipoUsuario.admin,
      conta: {
        create: { email, senhaHash: await bcrypt.hash(SENHA, 4) },
      },
    },
  });
  const res = await http(app)
    .post('/auth/signin')
    .send({ email, password: SENHA })
    .expect(201);
  return (res.body as { accessToken: string }).accessToken;
}

export async function criarLivro(
  app: INestApplication,
  tokenAdmin: string,
  dados: Record<string, unknown> = {},
) {
  const res = await http(app)
    .post('/admin/livros')
    .set(bearer(tokenAdmin))
    .send({
      titulo: `Livro ${randomUUID().slice(0, 8)}`,
      sinopse: 'Uma história de teste.',
      autor: 'Autora de Teste',
      genero: 'Romance',
      ano: 2020,
      precoCentavos: 2990,
      formato: 'PDF',
      capaCorInicio: '#1F3D33',
      capaCorFim: '#315C4C',
      capaCorTexto: '#C6A15B',
      ...dados,
    })
    .expect(201);
  return (res.body as { id: string }).id;
}

export function comprar(
  app: INestApplication,
  token: string,
  livroId: string,
  numeroCartao?: string,
) {
  return http(app)
    .post('/compras')
    .set(bearer(token))
    .send({ livroId, cartao: cartao(numeroCartao) });
}
