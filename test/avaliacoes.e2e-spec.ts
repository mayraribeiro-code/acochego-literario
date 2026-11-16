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

interface Pagina {
  itens: { id: string; nota: number; usuario: { nome: string } }[];
  total: number;
}

describe('Avaliações', () => {
  let app: INestApplication;
  let tokenAdmin: string;

  beforeAll(async () => {
    app = await criarApp();
    tokenAdmin = await criarAdmin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function leitorQueComprou(livroId: string, nome: string) {
    const { token } = await cadastrarCliente(app, nome);
    await comprar(app, token, livroId).expect(201);
    return token;
  }

  function avaliar(token: string, livroId: string, corpo: object) {
    return http(app)
      .put(`/livros/${livroId}/avaliacoes/minha`)
      .set(bearer(token))
      .send(corpo);
  }

  async function mediaDoLivro(livroId: string) {
    const res = await http(app).get(`/livros/${livroId}`).expect(200);
    const { avaliacao, totalAvaliacoes } = res.body as {
      avaliacao: number;
      totalAvaliacoes: number;
    };
    return [avaliacao, totalAvaliacoes];
  }

  it('só quem comprou avalia, com nota de 1 a 5', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    const { token: naoComprou } = await cadastrarCliente(app);
    await avaliar(naoComprou, livroId, { nota: 5 }).expect(403);

    const token = await leitorQueComprou(livroId, 'Clara');
    await avaliar(token, livroId, { nota: 0 }).expect(400);
    await avaliar(token, livroId, { nota: 6 }).expect(400);
    await avaliar(token, livroId, { nota: 4.5 }).expect(400);
    await avaliar(tokenAdmin, livroId, { nota: 5 }).expect(403);
  });

  it('calcula a média e o total, e recalcula ao editar e remover', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    const ana = await leitorQueComprou(livroId, 'Ana');
    const bia = await leitorQueComprou(livroId, 'Bia');

    expect(await mediaDoLivro(livroId)).toEqual([0, 0]);

    const salva = await avaliar(ana, livroId, {
      nota: 4,
      comentario: '  Gostei muito  ',
    }).expect(200);
    expect(salva.body).toMatchObject({
      nota: 4,
      comentario: 'Gostei muito',
      usuario: { nome: 'Ana' },
    });
    await avaliar(bia, livroId, { nota: 5 }).expect(200);
    expect(await mediaDoLivro(livroId)).toEqual([4.5, 2]);

    // Avaliar de novo substitui; comentário em branco vira "sem comentário".
    const editada = await avaliar(ana, livroId, {
      nota: 2,
      comentario: '   ',
    }).expect(200);
    expect(editada.body).toMatchObject({ nota: 2, comentario: null });
    expect(await mediaDoLivro(livroId)).toEqual([3.5, 2]);

    await http(app)
      .delete(`/livros/${livroId}/avaliacoes/minha`)
      .set(bearer(ana))
      .expect(204);
    expect(await mediaDoLivro(livroId)).toEqual([5, 1]);
    await http(app)
      .delete(`/livros/${livroId}/avaliacoes/minha`)
      .set(bearer(ana))
      .expect(404);
  });

  it('devolve a avaliação do próprio usuário', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    const token = await leitorQueComprou(livroId, 'Duda');

    const antes = await http(app)
      .get(`/livros/${livroId}/avaliacoes/minha`)
      .set(bearer(token))
      .expect(200);
    expect(antes.body).toEqual({ avaliacao: null });

    await avaliar(token, livroId, { nota: 3 }).expect(200);
    const depois = await http(app)
      .get(`/livros/${livroId}/avaliacoes/minha`)
      .set(bearer(token))
      .expect(200);
    expect(depois.body).toMatchObject({ avaliacao: { nota: 3 } });
  });

  it('lista paginada, das mais novas para as mais antigas, sem expor email', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    for (const nome of ['Primeira', 'Segunda', 'Terceira']) {
      const token = await leitorQueComprou(livroId, nome);
      await avaliar(token, livroId, { nota: 5 }).expect(200);
    }

    const p1 = await http(app)
      .get(`/livros/${livroId}/avaliacoes?limite=2`)
      .expect(200);
    const p2 = await http(app)
      .get(`/livros/${livroId}/avaliacoes?pagina=2&limite=2`)
      .expect(200);
    const nomes = (p: Pagina) => p.itens.map((i) => i.usuario.nome);

    expect(nomes(p1.body as Pagina)).toEqual(['Terceira', 'Segunda']);
    expect(nomes(p2.body as Pagina)).toEqual(['Primeira']);
    expect((p1.body as Pagina).total).toBe(3);
    expect(JSON.stringify(p1.body)).not.toContain('@');

    await http(app).get(`/livros/${livroId}/avaliacoes?pagina=0`).expect(400);
  });

  it('o admin remove qualquer avaliação; o cliente não', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    const token = await leitorQueComprou(livroId, 'Eva');
    const res = await avaliar(token, livroId, { nota: 1 }).expect(200);
    const id = (res.body as { id: string }).id;

    await http(app)
      .delete(`/admin/avaliacoes/${id}`)
      .set(bearer(token))
      .expect(403);
    await http(app)
      .delete(`/admin/avaliacoes/${id}`)
      .set(bearer(tokenAdmin))
      .expect(204);
    expect(await mediaDoLivro(livroId)).toEqual([0, 0]);
  });

  it('não lista avaliações de livro inativo', async () => {
    const livroId = await criarLivro(app, tokenAdmin, { ativo: false });
    await http(app).get(`/livros/${livroId}/avaliacoes`).expect(404);
  });
});
