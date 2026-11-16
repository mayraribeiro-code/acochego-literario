import { INestApplication } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  bearer,
  cadastrarCliente,
  criarAdmin,
  criarApp,
  criarLivro,
  http,
} from './utils';

// Só o começo de cada formato importa: a API detecta o tipo pelos bytes iniciais.
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 1),
]);
const JPG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(64, 2),
]);

const pastaCapas = () => join(process.env.STORAGE_DIR!, 'capas');

describe('Capas dos livros', () => {
  let app: INestApplication;
  let tokenAdmin: string;

  beforeAll(async () => {
    app = await criarApp();
    tokenAdmin = await criarAdmin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const enviar = (
    livroId: string,
    conteudo: Buffer,
    nome: string,
    token = tokenAdmin,
  ) =>
    http(app)
      .post(`/admin/livros/${livroId}/capa`)
      .set(bearer(token))
      .attach('capa', conteudo, nome);

  it('envia, serve publicamente, troca e remove a capa', async () => {
    const livroId = await criarLivro(app, tokenAdmin);

    // Sem capa enviada, a imagem não existe (o site desenha a capa com as cores).
    await http(app).get(`/livros/${livroId}/capa`).expect(404);

    const primeiro = await enviar(livroId, PNG, 'capa.png').expect(201);
    const arquivo1 = (primeiro.body as { capaArquivo: string }).capaArquivo;
    expect(arquivo1).toMatch(/\.png$/);

    const imagem = await http(app)
      .get(`/livros/${livroId}/capa`)
      .buffer(true)
      .expect(200);
    expect(imagem.headers['content-type']).toBe('image/png');
    expect(imagem.headers['cache-control']).toContain('immutable');
    expect(Buffer.compare(imagem.body as Buffer, PNG)).toBe(0);

    // O catálogo informa o arquivo, que o site usa para montar a URL.
    const livro = await http(app).get(`/livros/${livroId}`).expect(200);
    expect(livro.body).toMatchObject({ capaArquivo: arquivo1 });

    // Trocar gera um nome novo e apaga o arquivo antigo.
    const segundo = await enviar(livroId, JPG, 'outra.jpg').expect(201);
    const arquivo2 = (segundo.body as { capaArquivo: string }).capaArquivo;
    expect(arquivo2).toMatch(/\.jpg$/);
    expect(existsSync(join(pastaCapas(), arquivo1))).toBe(false);
    expect(existsSync(join(pastaCapas(), arquivo2))).toBe(true);

    const removido = await http(app)
      .delete(`/admin/livros/${livroId}/capa`)
      .set(bearer(tokenAdmin))
      .expect(200);
    expect(removido.body).toMatchObject({ capaArquivo: null });
    expect(existsSync(join(pastaCapas(), arquivo2))).toBe(false);
    await http(app).get(`/livros/${livroId}/capa`).expect(404);
  });

  it('recusa o que não é imagem, imagem grande demais e quem não é admin', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    await enviar(livroId, Buffer.from('não sou imagem'), 'falsa.png').expect(
      400,
    );
    await enviar(
      livroId,
      Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]),
      'grande.png',
    ).expect(413);

    const { token } = await cadastrarCliente(app);
    await enviar(livroId, PNG, 'capa.png', token).expect(403);
  });
});
