# Aconchego Literário — livraria-web

Frontend (React + Vite + TypeScript + Tailwind) da biblioteca online, implementado a partir do Figma Make "Website Development Project".

## Rodando

1. Suba a API em `../livraria-api` (porta 3000).
2. Aqui:

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Em desenvolvimento, as chamadas para `/api/*` são encaminhadas para `http://localhost:3000` (ver `vite.config.ts`). Em produção, defina `VITE_API_URL`.

## O que vem da API

Tudo: login/cadastro, catálogo e gêneros, compras e "Minha Biblioteca", o leitor digital e o painel admin (resumo, lista de compras, cadastro/edição de livros e envio dos arquivos PDF/EPUB). Os endpoints estão no README da livraria-api.

## Leitor digital

Abre pelo "Ler" da Minha Biblioteca ou pelo "Ler agora" na página do livro comprado. Lê PDF (com [pdf.js](https://mozilla.github.io/pdf.js/)) e EPUB (com [epub.js](https://github.com/futurepress/epub.js)); se o livro tiver os dois, abre o EPUB, que se ajusta à tela, e dá para trocar. Setas do teclado mudam de página e Esc fecha.

O arquivo é baixado com o token do usuário (não há link público) e o código do leitor só é carregado quando alguém abre um livro. Os arquivos são enviados pelo admin em "Editar livro" → "Arquivos digitais".

Ainda sem implementação: o botão "Baixar" (mostra "em breve").

`package.json` força `@xmldom/xmldom@0.8.15` (em `overrides`) porque o epub.js 0.3.93 depende de uma versão com falhas de segurança conhecidas.

## Estrutura

```
src/
  App.tsx            navegação entre telas e estado da sessão
  views/             Home, Catálogo, Detalhe do livro, Minha Biblioteca, Leitor, Admin
  components/        Header, modais de login, compra e livro, arquivos do livro, cards, capa, toast
  lib/api.ts         cliente da livraria-api (converte os dados da API para o formato das telas)
  styles/            tokens de cor/tipografia do design
```
