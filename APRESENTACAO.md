# Roteiro da apresentação: Aconchego Literário

Duração sugerida: 10 a 12 minutos.

## Antes de apresentar

Faça isto uma vez, no computador da apresentação:

```bash
npm install
cp .env.example .env          # se ainda não existir
npx prisma migrate dev        # cria o banco, o admin e o catálogo
cd web && npm install && cd ..
```

No dia, em dois terminais:

```bash
npm run demo                  # deixa os dados de demonstração como novos
npm run start:dev             # API em http://localhost:3000
```

```bash
cd web && npm run dev         # site em http://localhost:5173
```

`npm run demo` pode rodar quantas vezes quiser, inclusive logo antes de apresentar: ele apaga as compras, avaliações e leituras feitas no ensaio e recria tudo.

## Contas e cartões

| Para | Login | Senha |
| --- | --- | --- |
| Cliente (principal) | `ana@demo.com` | `demo1234` |
| Outros clientes | `bruno@demo.com`, `carla@demo.com`, `diego@demo.com`, `elisa@demo.com`, `felipe@demo.com` | `demo1234` |
| Admin | `ADMIN_EMAIL` do `.env` (padrão `admin@livraria.com`) | `ADMIN_PASSWORD` do `.env` (padrão `admin123`) |

| Cartão de teste | Resultado |
| --- | --- |
| `4242 4242 4242 4242` | aprovado |
| `4000 0000 0000 0002` | recusado pelo banco |
| `4000 0000 0000 9995` | saldo insuficiente |

Validade: qualquer mês/ano no futuro (ex.: `12/30`). CVV: qualquer número de 3 dígitos.

Situação da Ana no início: tem **Dom Casmurro** (parou na página 34 do PDF) e **O Cortiço**. **Não** tem **Memórias Póstumas de Brás Cubas**, que é o livro para comprar ao vivo.

## Roteiro

### 1. Visitante (1 min)
- Abra a página inicial e o **Catálogo**: busca, filtro por gênero e preço, ordenação por avaliação.
- Abra **Dom Casmurro**: sinopse, nota média (4,7) e **avaliações dos leitores** com comentários.
- Ponto para falar: sem login dá para navegar, mas não comprar nem ler.

### 2. Entrar e ver a biblioteca (1 min)
- **Entrar** com a Ana.
- **Minha Biblioteca**: os dois livros dela; Dom Casmurro mostra "28% lido" e o botão **Continuar**.
- Ponto para falar: cada tela tem endereço próprio (`/catalogo`, `/livro/...`, `/biblioteca`); o F5 e o voltar do navegador funcionam.

### 3. Leitor digital (2 min)
- Em Dom Casmurro, **Ler agora**: abre direto na **página 34 de 121**, onde ela parou.
- Avance algumas páginas e troque para **EPUB** no canto superior direito.
- Feche (ou use o voltar do navegador) e abra de novo: continua de onde parou.
- No celular, prefira o EPUB: o texto se ajusta à tela, enquanto o PDF mantém o tamanho de página A4.
- Ponto para falar: o arquivo não tem link público; a API só entrega para quem comprou, com o token de login.

### 4. Compra com pagamento (2 min)
- Abra **Memórias Póstumas de Brás Cubas** e clique em **Comprar livro**.
- Use primeiro o cartão `4000 0000 0000 0002`: aparece "Pagamento recusado pelo banco emissor".
- Troque para a aba **Pix** e clique em **Gerar Pix**: aparecem o QR code, o código copia e cola e a contagem de 15 minutos.
- Clique em **Simular pagamento** (faz o papel do app do banco): o site percebe sozinho e o livro entra na biblioteca.
- Se preferir mostrar o cartão aprovado, use `4242 4242 4242 4242` em outro livro.
- **Ler agora**: abre o EPUB.
- Ponto para falar: o pagamento é simulado, mas o fluxo é o de um gateway real (compra iniciada → aprovada ou recusada). Trocar por Mercado Pago ou Stripe mexe em uma peça só (`src/pagamentos`). A API guarda apenas os 4 últimos dígitos do cartão. O código Pix segue o padrão oficial do Banco Central, mas com uma chave de teste que não existe: escaneado num banco de verdade, é recusado.

### 5. Avaliar (1 min)
- Ainda em Memórias Póstumas, desça até **Avaliações dos leitores**, dê 5 estrelas e escreva um comentário.
- A média do livro muda na hora.
- Ponto para falar: só quem comprou pode avaliar; um usuário tem uma avaliação por livro.

### 6. Minha conta (30 s)
- No menu do usuário (nome no canto superior direito), **Minha conta**: alterar nome, trocar senha (derruba as sessões em outros aparelhos) e desativar a conta.
- Não desative a conta da Ana durante a apresentação.

### 7. Painel do admin (2 min)
- **Sair** e entrar como admin. Abra **Admin**.
- Resumo: livros ativos, compras, clientes e receita.
- Aba **Livros**: editar um livro, desativar/ativar, enviar arquivo PDF/EPUB e **imagem de capa** (sem imagem, a capa é desenhada com as cores do livro).
- Aba **Compras**: cada compra mostra a forma de pagamento (cartão final 4242 ou Pix).
- Aba **Compras**: a compra da Ana aparece no topo; mostre a do Bruno com "Pagamento recusado" e a do Diego "Cancelada".
- Em uma compra confirmada, **Cancelar compra** → **Confirmar estorno**: a receita cai, o livro sai da biblioteca do cliente e a avaliação dele é apagada.
- Na página de um livro, o admin pode remover avaliações (ícone de lixeira).

### 8. Privacidade (30 s)
- No rodapé, **Política de Privacidade**: o que o site guarda (senha só cifrada, só os 4 últimos dígitos do cartão), quem vê o quê e os direitos da LGPD.
- No cadastro há o link para ela.

### 9. Encerramento técnico (1 min, opcional)
- Stack: NestJS + Prisma + SQLite na API; React + Vite + Tailwind no site.
- Segurança: senhas com bcrypt, JWT renovado automaticamente, arquivos sem link público, conta desativada perde o acesso na hora.
- Qualidade: 37 testes automatizados (`npm run test:e2e`) cobrindo login, conta, compras, pagamento com cartão e Pix, capas, leitura e avaliações.

## Se algo der errado

| Problema | Solução |
| --- | --- |
| Catálogo não carrega | A API não está rodando: `npm run start:dev` |
| "Arquivo ainda não disponível" no leitor | Rode `npm run demo` (cadastra os arquivos dos livros) |
| Login da Ana falha | Rode `npm run demo` (recria as contas) |
| Ana já tem Memórias Póstumas | Sobrou do ensaio: rode `npm run demo` |
| `npm run demo` diz que um livro não existe | Rode o seed antes: `npx prisma db seed` |

Os livros com arquivo são de domínio público, do Projeto Gutenberg (ver `prisma/demo/livros/FONTES.md`). Os outros livros do catálogo podem ser comprados, mas não têm arquivo para ler.
