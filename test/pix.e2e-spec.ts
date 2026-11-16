import { INestApplication } from '@nestjs/common';
import { crc16 } from '../src/pagamentos/pix';
import {
  bearer,
  cadastrarCliente,
  comprar,
  criarAdmin,
  criarApp,
  criarLivro,
  http,
  prismaDe,
} from './utils';

interface CompraPix {
  id: string;
  status: string;
  metodo: string;
  pixCopiaECola: string;
  expiraEm: string;
  motivoFalha: string | null;
}

describe('Pagamento com Pix (simulado)', () => {
  let app: INestApplication;
  let tokenAdmin: string;

  beforeAll(async () => {
    app = await criarApp();
    tokenAdmin = await criarAdmin(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const gerarPix = (token: string, livroId: string) =>
    http(app)
      .post('/compras')
      .set(bearer(token))
      .send({ livroId, metodo: 'pix' });

  const simular = (token: string, compraId: string) =>
    http(app)
      .post(`/compras/${compraId}/pix/simular-pagamento`)
      .set(bearer(token));

  async function biblioteca(token: string) {
    const res = await http(app).get('/compras').set(bearer(token)).expect(200);
    return (res.body as { livro: { id: string } }[]).map((c) => c.livro.id);
  }

  it('gera um código Pix válido e só libera o livro depois do pagamento', async () => {
    const livroId = await criarLivro(app, tokenAdmin, { precoCentavos: 1790 });
    const { token } = await cadastrarCliente(app);

    const res = await gerarPix(token, livroId).expect(201);
    const pix = res.body as CompraPix;
    expect(pix).toMatchObject({ status: 'iniciada', metodo: 'pix' });

    // BR Code: começa com o cabeçalho, traz a chave de teste e o valor, e o
    // CRC no final confere.
    const codigo = pix.pixCopiaECola;
    expect(codigo.startsWith('000201')).toBe(true);
    expect(codigo).toContain('br.gov.bcb.pix');
    expect(codigo).toContain('pix-teste@aconchego.invalid');
    expect(codigo).toContain('540517.90');
    expect(crc16(codigo.slice(0, -4))).toBe(codigo.slice(-4));

    const minutos = (new Date(pix.expiraEm).getTime() - Date.now()) / 60000;
    expect(minutos).toBeGreaterThan(14);
    expect(minutos).toBeLessThanOrEqual(15);

    // Ainda não pagou: nada de biblioteca nem leitura.
    expect(await biblioteca(token)).toEqual([]);
    await http(app).get(`/leitura/${livroId}`).set(bearer(token)).expect(403);
    const antes = await http(app)
      .get(`/compras/${pix.id}`)
      .set(bearer(token))
      .expect(200);
    expect(antes.body).toMatchObject({ status: 'iniciada' });

    const pago = await simular(token, pix.id).expect(200);
    expect(pago.body).toMatchObject({ status: 'confirmada', metodo: 'pix' });
    expect(await biblioteca(token)).toEqual([livroId]);

    // Simular de novo não muda nada.
    await simular(token, pix.id).expect(200);
    await comprar(app, token, livroId).expect(409);
  });

  it('outro usuário não vê nem paga o Pix de ninguém', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    const { token } = await cadastrarCliente(app);
    const { token: outro } = await cadastrarCliente(app);
    const pix = (await gerarPix(token, livroId).expect(201)).body as CompraPix;

    await http(app).get(`/compras/${pix.id}`).set(bearer(outro)).expect(404);
    await simular(outro, pix.id).expect(404);
    await simular(tokenAdmin, pix.id).expect(403);
  });

  it('Pix vencido vira falha, não pode ser pago e dá para comprar de novo', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    const { token } = await cadastrarCliente(app);
    const pix = (await gerarPix(token, livroId).expect(201)).body as CompraPix;

    await prismaDe(app).compra.update({
      where: { id: pix.id },
      data: { expiraEm: new Date(Date.now() - 1000) },
    });

    const res = await http(app)
      .get(`/compras/${pix.id}`)
      .set(bearer(token))
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'falha',
      motivoFalha: 'Pix expirado',
    });
    const recusa = await simular(token, pix.id).expect(400);
    expect(recusa.body).toMatchObject({
      message: 'Este Pix expirou. Gere um novo para pagar',
    });

    await gerarPix(token, livroId).expect(201);
  });

  it('dá para desistir do Pix e pagar com cartão; o Pix antigo deixa de valer', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    const { token } = await cadastrarCliente(app);
    const pix = (await gerarPix(token, livroId).expect(201)).body as CompraPix;

    // Gerar outro Pix substitui o primeiro.
    const novo = (await gerarPix(token, livroId).expect(201)).body as CompraPix;
    expect(novo.pixCopiaECola).toBeTruthy();

    await comprar(app, token, livroId).expect(201);
    expect(await biblioteca(token)).toEqual([livroId]);

    const res = await simular(token, pix.id).expect(400);
    expect(res.body).toMatchObject({
      message: 'Esta compra não é um pagamento Pix',
    });
  });

  it('o admin pode cancelar uma compra paga com Pix', async () => {
    const livroId = await criarLivro(app, tokenAdmin);
    const { token } = await cadastrarCliente(app);
    const pix = (await gerarPix(token, livroId).expect(201)).body as CompraPix;
    await simular(token, pix.id).expect(200);

    await http(app)
      .post(`/admin/compras/${pix.id}/cancelar`)
      .set(bearer(tokenAdmin))
      .expect(200);
    expect(await biblioteca(token)).toEqual([]);
  });
});
