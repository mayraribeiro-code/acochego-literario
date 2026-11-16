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

Tudo: login/cadastro, catálogo e gêneros, compras e "Minha Biblioteca", e o painel admin (resumo, lista de compras, ativar/desativar livro). Os endpoints estão no README da livraria-api.

Ainda sem implementação: leitor digital e download (os botões mostram "em breve") e os botões "Novo livro" / editar do painel admin (a API já tem `POST` e `PATCH /admin/livros`, falta o formulário).

## Estrutura

```
src/
  App.tsx            navegação entre telas e estado da sessão
  views/             Home, Catálogo, Detalhe do livro, Minha Biblioteca, Admin
  components/        Header, modais de login e compra, cards, capa, toast
  lib/api.ts         cliente da livraria-api (converte os dados da API para o formato das telas)
  styles/            tokens de cor/tipografia do design
```
