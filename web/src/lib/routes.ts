import type { View } from "../types";

// Cada tela tem um endereço, para o F5 e os botões voltar/avançar do
// navegador funcionarem. Ex.: /livro/<id> abre o detalhe daquele livro.
export interface Route {
  view: View;
  bookId?: string;
}

const PATHS: Record<Exclude<View, "bookDetail">, string> = {
  home: "/",
  catalog: "/catalogo",
  library: "/biblioteca",
  account: "/conta",
  admin: "/admin",
};

export function pathFor({ view, bookId }: Route) {
  if (view === "bookDetail") return `/livro/${bookId ?? ""}`;
  return PATHS[view];
}

export function parsePath(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/";
  const livro = /^\/livro\/([^/]+)$/.exec(path);
  if (livro) return { view: "bookDetail", bookId: decodeURIComponent(livro[1]) };
  const found = (Object.entries(PATHS) as [View, string][]).find(([, p]) => p === path);
  return { view: found ? found[0] : "home" };
}

// Título da aba do navegador.
const TITLES: Record<View, string> = {
  home: "Início",
  catalog: "Catálogo",
  bookDetail: "Livro",
  library: "Minha Biblioteca",
  account: "Minha conta",
  admin: "Painel Admin",
};

export function documentTitle(view: View, bookTitle?: string) {
  const page = view === "bookDetail" && bookTitle ? bookTitle : TITLES[view];
  return view === "home" ? "Aconchego Literário" : `${page} · Aconchego Literário`;
}
