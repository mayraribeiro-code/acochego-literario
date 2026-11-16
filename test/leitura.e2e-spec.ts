import { INestApplication } from '@nestjs/common';
import {
  bearer,
  cadastrarCliente,
  comprar,
  criarAdmin,
  criarApp,
  criarLivro,
  http,
} from './utils';

// O menor conteúdo que a API reconhece como PDF (começa com "%PDF-").
const PDF = Buffer.from('%PDF-1.4\n%%EOF\n', 'latin1');

describe('Arquivos e leitura', () => {
  let app: INestApplication;
  let tokenAdmin: string;
  let livroId: string;

  beforeAll(async () => {
    app = await criarApp();
    tokenAdmin = await criarAdmin(app);
    livroId = await criarLivro(app, tokenAdmin, { titulo: 'Dom Casmurro' });
    await http(app)
      .post(`/admin/livros/${livroId}/arquivos`)
      .set(bearer(tokenAdmin))
      .attach('arquivo', PDF, 'livro.pdf')
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('recusa arquivo que não é PDF nem EPUB, mesmo com nome .pdf', async () => {
    await http(app)
      .post(`/admin/livros/${livroId}/arquivos`)
      .set(bearer(tokenAdmin))
      .attach('arquivo', Buffer.from('só texto'), 'falso.pdf')
      .expect(400);
  });

  it('só quem comprou lê e baixa', async () => {
    const { token } = await cadastrarCliente(app);

    await http(app).get(`/leitura/${livroId}`).set(bearer(token)).expect(403);
    await http(app)
      .get(`/leitura/${livroId}/PDF`)
      .set(bearer(token))
      .expect(403);
    // Nem o admin lê por aqui.
    await http(app)
      .get(`/leitura/${livroId}/PDF`)
      .set(bearer(tokenAdmin))
      .expect(403);

    await comprar(app, token, livroId).expect(201);

    const formatos = await http(app)
      .get(`/leitura/${livroId}`)
      .set(bearer(token))
      .expect(200);
    expect(formatos.body).toEqual({ formatos: ['PDF'] });

    const conteudo = await http(app)
      .get(`/leitura/${livroId}/PDF`)
      .set(bearer(token))
      .buffer(true)
      .expect(200);
    expect(conteudo.headers['content-type']).toBe('application/pdf');
    expect(Buffer.compare(conteudo.body as Buffer, PDF)).toBe(0);

    const download = await http(app)
      .get(`/leitura/${livroId}/PDF/download`)
      .set(bearer(token))
      .expect(200);
    expect(download.headers['content-disposition']).toContain(
      'attachment; filename="Dom Casmurro.pdf"',
    );

    await http(app)
      .get(`/leitura/${livroId}/EPUB`)
      .set(bearer(token))
      .expect(404);
  });

  it('devolve o progresso da biblioteca, um item por livro, só de livros comprados', async () => {
    const { token } = await cadastrarCliente(app);
    await comprar(app, token, livroId).expect(201);
    const outro = await criarLivro(app, tokenAdmin);
    await comprar(app, token, outro).expect(201);

    const salvar = (id: string, formato: string, percentual: number) =>
      http(app)
        .put(`/leitura/${id}/progresso`)
        .set(bearer(token))
        .send({ formato, posicao: '1', percentual })
        .expect(200);
    await salvar(livroId, 'EPUB', 10);
    await salvar(livroId, 'PDF', 30);
    await salvar(outro, 'PDF', 70);

    const res = await http(app)
      .get('/leitura/progresso')
      .set(bearer(token))
      .expect(200);
    const lista = res.body as {
      livroId: string;
      formato: string;
      percentual: number;
    }[];
    expect(lista).toHaveLength(2);
    expect(lista.find((p) => p.livroId === livroId)).toMatchObject({
      formato: 'PDF',
      percentual: 30,
    });

    // Compra cancelada some da lista.
    const compras = await http(app)
      .get('/admin/compras?limite=100')
      .set(bearer(tokenAdmin));
    const compraOutro = (
      compras.body as {
        itens: { id: string; livroId: string; usuarioId: string }[];
      }
    ).itens.find((c) => c.livroId === outro);
    await http(app)
      .post(`/admin/compras/${compraOutro!.id}/cancelar`)
      .set(bearer(tokenAdmin))
      .expect(200);
    const depois = await http(app)
      .get('/leitura/progresso')
      .set(bearer(token))
      .expect(200);
    expect(depois.body).toHaveLength(1);

    await http(app).get('/leitura/progresso').expect(401);
  });

  it('salva e devolve o progresso de leitura', async () => {
    const { token } = await cadastrarCliente(app);
    await comprar(app, token, livroId).expect(201);

    await http(app)
      .put(`/leitura/${livroId}/progresso`)
      .set(bearer(token))
      .send({ formato: 'PDF', posicao: '12', percentual: 40 })
      .expect(200);
    await http(app)
      .put(`/leitura/${livroId}/progresso`)
      .set(bearer(token))
      .send({ formato: 'PDF', posicao: '15', percentual: 50 })
      .expect(200);
    await http(app)
      .put(`/leitura/${livroId}/progresso`)
      .set(bearer(token))
      .send({ formato: 'PDF', posicao: '1', percentual: 101 })
      .expect(400);

    const res = await http(app)
      .get(`/leitura/${livroId}/progresso`)
      .set(bearer(token))
      .expect(200);
    expect(res.body).toMatchObject([
      { formato: 'PDF', posicao: '15', percentual: 50 },
    ]);
  });
});
