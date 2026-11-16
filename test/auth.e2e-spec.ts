import { INestApplication } from '@nestjs/common';
import {
  SENHA,
  bearer,
  cadastrarCliente,
  criarAdmin,
  criarApp,
  http,
} from './utils';

describe('Autenticação e conta', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('cadastro e login', () => {
    it('cadastra, entra e devolve os dados do usuário sem a senha', async () => {
      const { email, token } = await cadastrarCliente(app, 'Beatriz');

      const me = await http(app).get('/auth/me').set(bearer(token)).expect(200);
      expect(me.body).toMatchObject({
        nome: 'Beatriz',
        tipoUsuario: 'comum',
        conta: { email },
      });
      expect(JSON.stringify(me.body)).not.toContain('senhaHash');

      await http(app)
        .post('/auth/signin')
        .send({ email, password: SENHA })
        .expect(201);
    });

    it('recusa senha curta no cadastro', async () => {
      await http(app)
        .post('/auth/signup')
        .send({ name: 'X', email: 'curta@teste.com', password: '1234567' })
        .expect(400);
    });

    it('recusa email repetido e senha errada', async () => {
      const { email } = await cadastrarCliente(app);
      await http(app)
        .post('/auth/signup')
        .send({ name: 'Outra', email, password: SENHA })
        .expect(401);
      await http(app)
        .post('/auth/signin')
        .send({ email, password: 'senha-errada' })
        .expect(401);
    });

    it('exige token nas rotas logadas', async () => {
      await http(app).get('/auth/me').expect(401);
      await http(app).get('/auth/me').set(bearer('token-invalido')).expect(401);
    });
  });

  describe('renovação da sessão', () => {
    it('troca o token por um novo que funciona', async () => {
      const { token } = await cadastrarCliente(app);
      const res = await http(app)
        .post('/auth/refresh')
        .set(bearer(token))
        .expect(201);
      const novo = (res.body as { accessToken: string }).accessToken;
      await http(app).get('/auth/me').set(bearer(novo)).expect(200);
    });
  });

  describe('perfil e senha', () => {
    it('altera o nome', async () => {
      const { token } = await cadastrarCliente(app, 'Nome Antigo');
      const res = await http(app)
        .patch('/auth/me')
        .set(bearer(token))
        .send({ nome: '  Nome Novo  ' })
        .expect(200);
      expect(res.body).toMatchObject({ nome: 'Nome Novo' });
    });

    it('troca a senha, derruba os tokens antigos e mantém quem trocou logado', async () => {
      const { email, token } = await cadastrarCliente(app);
      const novaSenha = 'uma-senha-nova';

      await http(app)
        .put('/auth/senha')
        .set(bearer(token))
        .send({ senhaAtual: 'errada', novaSenha })
        .expect(400);

      const res = await http(app)
        .put('/auth/senha')
        .set(bearer(token))
        .send({ senhaAtual: SENHA, novaSenha })
        .expect(200);
      const tokenNovo = (res.body as { accessToken: string }).accessToken;

      await http(app).get('/auth/me').set(bearer(token)).expect(401);
      await http(app).get('/auth/me').set(bearer(tokenNovo)).expect(200);

      await http(app)
        .post('/auth/signin')
        .send({ email, password: SENHA })
        .expect(401);
      await http(app)
        .post('/auth/signin')
        .send({ email, password: novaSenha })
        .expect(201);
    });

    it('recusa nova senha igual à atual', async () => {
      const { token } = await cadastrarCliente(app);
      await http(app)
        .put('/auth/senha')
        .set(bearer(token))
        .send({ senhaAtual: SENHA, novaSenha: SENHA })
        .expect(400);
    });
  });

  describe('desativação da conta', () => {
    it('pede a senha, desativa e bloqueia token, renovação e login', async () => {
      const { email, token } = await cadastrarCliente(app);

      await http(app)
        .post('/auth/desativar')
        .set(bearer(token))
        .send({ senha: 'errada' })
        .expect(400);

      await http(app)
        .post('/auth/desativar')
        .set(bearer(token))
        .send({ senha: SENHA })
        .expect(204);

      await http(app).get('/auth/me').set(bearer(token)).expect(401);
      await http(app).post('/auth/refresh').set(bearer(token)).expect(401);
      const login = await http(app)
        .post('/auth/signin')
        .send({ email, password: SENHA })
        .expect(401);
      expect(login.body).toMatchObject({ message: 'User is not active' });
    });

    it('não deixa o admin se desativar', async () => {
      const tokenAdmin = await criarAdmin(app);
      await http(app)
        .post('/auth/desativar')
        .set(bearer(tokenAdmin))
        .send({ senha: SENHA })
        .expect(403);
    });
  });
});
