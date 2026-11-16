import { INestApplication } from '@nestjs/common';
import {
  bearer,
  cadastrarCliente,
  cartao,
  comprar,
  criarAdmin,
  criarApp,
  criarLivro,
  http,
  prismaDe,
} from './utils';

const RECUSADO = '4000000000000002';
const SALDO_INSUFICIENTE = '4000000000009995';

describe('Compras e pagamento', () => {
  let app: INestApplication;
  let tokenAdmin: string;

  beforeAll(async () => {
    app = await criarApp();
    tokenAdmin = await criarAdmin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function biblioteca(token: string) {
    const res = await http(app).get('/compras').set(bearer(token)).expect(200);
    return (res.body as { livro: { id: string } }[]).map((c) => c.livro.id);
  }

  it('confirma a compra com cartão aprovado e guarda só o final do cartão', async () => {
    const livroId = await criarLivro(app, tokenAdmin, { precoCentavos: 3490 });
    const { token } = await cadastrarCliente(app);

    const res = await comprar(app, token, livroId).expect(201);
    expect(res.body).toMatchObject({
      status: 'confirmada',
      valorCentavos: 3490,
      cartaoFinal: '4242',
    });
    expect((res.body as { transacaoId: string }).transacaoId).toMatch(/^sim_/);
    expect(JSON.stringify(res.body)).not.toContain('4242424242424242');
    expect(await biblioteca(token)).toEqual([livroId]);
  });

  it('marca falha quando o cartão é recusado e deixa tentar de novo', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    const { token } = await cadastrarCliente(app);

    const recusa = await comprar(app, token, livroId, RECUSADO).expect(402);
    expect(recusa.body).toMatchObject({
      message: 'Pagamento recusado pelo banco emissor',
    });
    await comprar(app, token, livroId, SALDO_INSUFICIENTE).expect(402);
    expect(await biblioteca(token)).toEqual([]);

    await comprar(app, token, livroId).expect(201);
    expect(await biblioteca(token)).toEqual([livroId]);
    expect(await prismaDe(app).compra.count({ where: { livroId } })).toBe(1);
  });

  it('recusa número de cartão inválido, cartão vencido e compra sem cartão', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    const { token } = await cadastrarCliente(app);

    // Passa no formato, mas não no dígito verificador (Luhn).
    await comprar(app, token, livroId, '4242424242424241').expect(402);
    await http(app)
      .post('/compras')
      .set(bearer(token))
      .send({ livroId, cartao: { ...cartao(), anoValidade: 2020 } })
      .expect(400);
    await http(app)
      .post('/compras')
      .set(bearer(token))
      .send({ livroId })
      .expect(400);
    await http(app)
      .post('/compras')
      .set(bearer(token))
      .send({ livroId, cartao: { ...cartao(), numero: '12' } })
      .expect(400);
  });

  it('livro gratuito é confirmado sem cartão', async () => {
    const livroId = await criarLivro(app, tokenAdmin, { precoCentavos: 0 });
    const { token } = await cadastrarCliente(app);
    const res = await http(app)
      .post('/compras')
      .set(bearer(token))
      .send({ livroId })
      .expect(201);
    expect(res.body).toMatchObject({ status: 'confirmada', transacaoId: null });
  });

  it('não deixa comprar duas vezes, nem livro inativo ou indisponível', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    const inativo = await criarLivro(app, tokenAdmin, { ativo: false });
    const emBreve = await criarLivro(app, tokenAdmin, { disponivel: false });
    const { token } = await cadastrarCliente(app);

    await comprar(app, token, livroId).expect(201);
    await comprar(app, token, livroId).expect(409);
    await comprar(app, token, inativo).expect(404);
    await comprar(app, token, emBreve).expect(400);
  });

  it('o admin não compra', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    await comprar(app, tokenAdmin, livroId).expect(403);
  });

  it('guarda o preço pago mesmo se o livro mudar de preço', async () => {
    const livroId = await criarLivro(app, tokenAdmin, { precoCentavos: 1000 });
    const { token } = await cadastrarCliente(app);
    await comprar(app, token, livroId).expect(201);

    await http(app)
      .patch(`/admin/livros/${livroId}`)
      .set(bearer(tokenAdmin))
      .send({ precoCentavos: 5000 })
      .expect(200);

    const res = await http(app).get('/compras').set(bearer(token)).expect(200);
    expect(res.body).toMatchObject([{ valorCentavos: 1000 }]);
  });

  describe('cancelamento pelo admin', () => {
    it('cancela, tira da biblioteca, apaga a avaliação e permite comprar de novo', async () => {
      const livroId = await criarLivro(app, tokenAdmin);
      const { token } = await cadastrarCliente(app);
      const compra = await comprar(app, token, livroId).expect(201);
      const compraId = (compra.body as { id: string }).id;

      await http(app)
        .put(`/livros/${livroId}/avaliacoes/minha`)
        .set(bearer(token))
        .send({ nota: 5 })
        .expect(200);

      const resumoAntes = await http(app)
        .get('/admin/resumo')
        .set(bearer(tokenAdmin))
        .expect(200);

      const res = await http(app)
        .post(`/admin/compras/${compraId}/cancelar`)
        .set(bearer(tokenAdmin))
        .expect(200);
      expect(res.body).toMatchObject({ status: 'cancelada' });
      expect((res.body as { canceladaEm: string }).canceladaEm).toBeTruthy();

      expect(await biblioteca(token)).toEqual([]);
      await http(app).get(`/leitura/${livroId}`).set(bearer(token)).expect(403);

      const livro = await http(app).get(`/livros/${livroId}`).expect(200);
      expect(livro.body).toMatchObject({ avaliacao: 0, totalAvaliacoes: 0 });

      const resumoDepois = await http(app)
        .get('/admin/resumo')
        .set(bearer(tokenAdmin))
        .expect(200);
      const antes = resumoAntes.body as { receitaCentavos: number };
      const depois = resumoDepois.body as { receitaCentavos: number };
      expect(antes.receitaCentavos - depois.receitaCentavos).toBe(2990);

      // Cancelar de novo não faz sentido.
      await http(app)
        .post(`/admin/compras/${compraId}/cancelar`)
        .set(bearer(tokenAdmin))
        .expect(400);

      // Pode comprar outra vez; a mesma linha é reaproveitada.
      await comprar(app, token, livroId).expect(201);
      expect(await biblioteca(token)).toEqual([livroId]);
    });

    it('só o admin cancela', async () => {
      const livroId = await criarLivro(app, tokenAdmin);
      const { token } = await cadastrarCliente(app);
      const compra = await comprar(app, token, livroId).expect(201);
      await http(app)
        .post(`/admin/compras/${(compra.body as { id: string }).id}/cancelar`)
        .set(bearer(token))
        .expect(403);
    });
  });

  describe('lista do admin', () => {
    it('é paginada', async () => {
      const res = await http(app)
        .get('/admin/compras?pagina=1&limite=2')
        .set(bearer(tokenAdmin))
        .expect(200);
      const pagina = res.body as { itens: unknown[]; total: number };
      expect(pagina.itens).toHaveLength(2);
      expect(pagina.total).toBeGreaterThan(2);

      await http(app)
        .get('/admin/compras?limite=101')
        .set(bearer(tokenAdmin))
        .expect(400);
    });
  });
});
