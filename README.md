# Livraria API

Backend do sistema de gerenciamento e venda de livros, construído com NestJS, Prisma e SQLite.

O site (frontend React do "Aconchego Literário") fica na pasta [`web/`](web/README.md), com seu próprio `package.json`. Para rodar os dois: suba a API (passos abaixo) e, em outro terminal, `cd web && npm install && npm run dev`.

## 🚀 Como rodar o projeto localmente

**1. Instale as dependências**
```bash
npm install
```

**2. Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

**3. Crie o banco de dados (Prisma + SQLite)**

O banco é um arquivo local (`prisma/dev.db`), criado automaticamente pelo comando abaixo:
```bash
npx prisma migrate dev
```

Esse comando também roda o seed (`prisma/seed.js`), que cria o usuário administrador com o email e a senha definidos em `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`, e o catálogo inicial de livros (`prisma/catalogo.js`). O seed pode rodar mais de uma vez sem duplicar nada. Para rodar o seed de novo manualmente:
```bash
npx prisma db seed
```

**4. Rode a API**
```bash
npm run start:dev
```

A API estará disponível em: `http://localhost:3000`

**5. (Opcional) Dados de demonstração**
```bash
npm run demo
```
Cria clientes (`ana@demo.com`, senha `demo1234`), compras, avaliações e os arquivos de três livros em domínio público. Pode rodar de novo para resetar a demonstração. O passo a passo da apresentação está em [APRESENTACAO.md](APRESENTACAO.md).

## 📚 Endpoints

| Método | Rota | Acesso | O que faz |
| --- | --- | --- | --- |
| POST | `/auth/signup` | público | cria conta de cliente e devolve o token (senha com pelo menos 8 caracteres) |
| POST | `/auth/signin` | público | login, devolve o token |
| GET | `/auth/me` | logado | dados do usuário do token |
| POST | `/auth/refresh` | logado | troca um token ainda válido por um novo, com prazo renovado (conta desativada não renova) |
| PATCH | `/auth/me` | logado | altera o nome: `{ "nome": "..." }` |
| PUT | `/auth/senha` | logado | troca a senha: `{ "senhaAtual": "...", "novaSenha": "..." }`; devolve um token novo e derruba os antigos |
| POST | `/auth/desativar` | cliente | desativa a própria conta: `{ "senha": "..." }` (o admin não pode) |
| GET | `/livros` | público | catálogo (só livros ativos) |
| GET | `/livros/generos` | público | gêneros que têm livros no catálogo |
| GET | `/livros/:id` | público | detalhe de um livro ativo |
| POST | `/compras` | cliente | compra e paga um livro: `{ "livroId": "...", "cartao": { ... } }` (veja "Pagamento" abaixo) |
| GET | `/compras` | logado | compras do próprio usuário (a "Minha Biblioteca") |
| GET | `/admin/livros` | admin | todos os livros, inclusive inativos |
| POST | `/admin/livros` | admin | cadastra livro (autor e gênero pelo nome; são criados se não existirem) |
| PATCH | `/admin/livros/:id` | admin | edita livro; `{ "ativo": false }` tira do catálogo |
| GET | `/admin/compras` | admin | todas as compras, paginadas (mais novas primeiro) |
| POST | `/admin/compras/:id/cancelar` | admin | cancela uma compra confirmada e estorna o pagamento |
| GET | `/admin/resumo` | admin | livros ativos, compras, clientes e receita |
| GET | `/admin/livros/:id/arquivos` | admin | arquivos digitais (PDF/EPUB) do livro |
| POST | `/admin/livros/:id/arquivos` | admin | envia arquivo (`multipart/form-data`, campo `arquivo`, até 50 MB) |
| DELETE | `/admin/livros/:id/arquivos/:formato` | admin | remove o arquivo `PDF` ou `EPUB` |
| GET | `/leitura/progresso` | logado | leitura mais recente de cada livro da biblioteca (para a "Minha Biblioteca") |
| GET | `/leitura/:livroId` | quem comprou | formatos disponíveis para leitura |
| GET | `/leitura/:livroId/:formato` | quem comprou | conteúdo do arquivo, para o leitor do site |
| GET | `/leitura/:livroId/:formato/download` | quem comprou | o mesmo arquivo como anexo, com o nome do livro |
| GET | `/leitura/:livroId/progresso` | quem comprou | onde o usuário parou em cada formato (mais recente primeiro) |
| PUT | `/leitura/:livroId/progresso` | quem comprou | salva a posição: `{ "formato": "PDF", "posicao": "12", "percentual": 40 }` (no EPUB, `posicao` é o CFI) |
| GET | `/livros/:livroId/avaliacoes` | público | avaliações do livro, paginadas (mais novas primeiro), com o nome de quem avaliou |
| GET | `/livros/:livroId/avaliacoes/minha` | logado | `{ "avaliacao": ... }` do próprio usuário, ou `null` |
| PUT | `/livros/:livroId/avaliacoes/minha` | cliente que comprou | avalia ou edita: `{ "nota": 4, "comentario": "opcional" }` |
| DELETE | `/livros/:livroId/avaliacoes/minha` | logado | remove a própria avaliação |
| DELETE | `/admin/avaliacoes/:id` | admin | remove qualquer avaliação (moderação) |

Rotas "logado", "cliente" e "admin" exigem o header `Authorization: Bearer <token>`.

Listas paginadas (`/livros/:livroId/avaliacoes` e `/admin/compras`): use `?pagina=1&limite=20` (padrão 1 e 20; limite máximo 100). A resposta é `{ "itens": [...], "total": 57, "pagina": 1, "limite": 20 }`.

Regras de compra:
- valores ficam em centavos (`precoCentavos`, `valorCentavos`);
- a compra guarda o preço pago, mesmo que o preço do livro mude depois;
- não dá para comprar livro inativo (404), indisponível (400) ou que você já tem (409);
- a compra passa por `iniciada` → `confirmada` (pagamento aprovado) ou `falha` (recusado, resposta 402 com o motivo); depois de uma falha dá para tentar de novo;
- o admin pode cancelar uma compra confirmada: o pagamento é estornado, o livro sai da biblioteca e a avaliação do cliente é apagada; o cliente pode comprar de novo;
- livros desativados continuam na biblioteca de quem já comprou.

Pagamento:
- o pagamento é **simulado** (`src/pagamentos/gateway-simulado.ts`): nada é cobrado de verdade;
- envie o cartão em `cartao`: `{ "numero": "4242424242424242", "nomeTitular": "Ana", "mesValidade": 12, "anoValidade": 2030, "cvv": "123" }`;
- cartões de teste: `4242 4242 4242 4242` aprova, `4000 0000 0000 0002` é recusado e `4000 0000 0000 9995` simula saldo insuficiente; números com dígito verificador inválido também são recusados;
- livros com preço 0 não pedem cartão;
- a API guarda só os 4 últimos dígitos do cartão e o id da transação;
- para usar um serviço real (Mercado Pago, Stripe...), escreva outra implementação de `GatewayPagamento` e troque em `src/pagamentos/pagamentos.module.ts`. Num serviço real o site deve enviar o cartão direto para o serviço e a API receber só um token, para o número do cartão não passar pelo servidor.

Conta:
- conta desativada não entra, não renova a sessão e perde os tokens que já tinha;
- trocar a senha encerra as sessões em outros aparelhos.

Avaliações:
- só quem tem compra confirmada avalia, com nota inteira de 1 a 5 e comentário opcional (até 2000 caracteres);
- cada usuário tem uma avaliação por livro; enviar de novo substitui a anterior;
- `avaliacao` (média com uma casa decimal) e `totalAvaliacoes` do livro são recalculados pela API a cada mudança e não podem ser editados pelo admin;
- as notas do seed eram fictícias e foram zeradas: agora só contam avaliações reais.

Arquivos dos livros:
- ficam na pasta `STORAGE_DIR` (padrão `./storage`, fora do git), com nome gerado pela API;
- o formato é detectado pelo conteúdo do arquivo; um `.txt` renomeado para `.pdf` é recusado;
- cada livro tem no máximo um arquivo por formato, e reenviar substitui o anterior;
- não existe link público: `/leitura` só entrega o arquivo para quem tem compra confirmada (nem o admin lê por ali);
- cadastre apenas arquivos que você tem direito de distribuir.

## 🧪 Testes

```bash
npm run test:e2e
```

Os testes e2e (pasta `test/`) sobem a API inteira e testam as rotas de autenticação, conta, compras e pagamento, leitura e avaliações. Eles usam um banco separado, `prisma/test.db`, que é apagado e recriado a cada execução, e uma pasta temporária para os arquivos. O banco de desenvolvimento (`prisma/dev.db`) e a pasta `storage/` não são tocados.

## 🛠️ Comandos úteis do NestJS

O Nest CLI já vem instalado no projeto, por isso os comandos usam `npx` na frente.

**Gerar um recurso completo (module + controller + service + DTOs)**
```bash
npx nest g resource livros
```
O CLI vai perguntar o tipo de API (escolha **REST API**) e se deve gerar os pontos de CRUD (responda **Y**). Os arquivos são criados em `src/livros/` e o módulo já é registrado no `app.module.ts`.

> Na primeira vez, o `nest g resource` adiciona o pacote `@nestjs/mapped-types` no `package.json`. Rode `npm install` depois dele. Mantenha a versão 2.x desse pacote: a 12 é publicada só como ESM e quebra os testes do Jest.

**Gerar as partes separadamente**
```bash
npx nest g module livros       # cria src/livros/livros.module.ts
npx nest g controller livros   # cria src/livros/livros.controller.ts
npx nest g service livros      # cria src/livros/livros.service.ts
```

**Opções úteis**
| Opção | O que faz |
| --- | --- |
| `--no-spec` | não cria o arquivo de teste (`.spec.ts`) |

Exemplo: `npx nest g resource autores --no-spec`

**Outros comandos**
```bash
npm run start:dev   # roda a API e reinicia sozinha a cada alteração
npm run build       # compila o projeto para a pasta dist/
npm run lint        # procura e corrige problemas no código
npm run format      # formata o código com o Prettier
```

## 🗄️ Comandos úteis do Prisma

**Depois de alterar o `prisma/schema.prisma`**, crie uma migration para aplicar a mudança no banco:
```bash
npx prisma migrate dev --name descreva-a-mudanca
```
Exemplo: `npx prisma migrate dev --name cria-tabela-livros`

**Outros comandos**
```bash
npx prisma studio          # abre uma tela no navegador para ver e editar os dados do banco
npx prisma migrate reset   # apaga o banco, recria do zero e roda o seed de novo
npx prisma generate        # atualiza o Prisma Client (use se o editor não reconhecer um model novo)
```
