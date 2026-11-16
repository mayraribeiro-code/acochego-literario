import type { AdminPurchase, AdminSummary, AppUser, Book, Review } from "../types";

// Em desenvolvimento o Vite encaminha /api para a livraria-api (ver vite.config.ts).
const API_URL = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "aconchego:token";

export class ApiError extends Error {}

interface MeResponse {
  id: string;
  nome: string;
  tipoUsuario: "comum" | "admin";
  conta: { email: string };
}

interface LivroResponse {
  id: string;
  titulo: string;
  sinopse: string;
  ano: number;
  precoCentavos: number;
  formato: string;
  disponivel: boolean;
  ativo: boolean;
  capaCorInicio: string;
  capaCorFim: string;
  capaCorTexto: string;
  avaliacao: number;
  totalAvaliacoes: number;
  autor: { nome: string };
  genero: { nome: string };
}

interface CompraResponse {
  id: string;
  valorCentavos: number;
  createdAt: string;
  livro: LivroResponse;
}

interface AdminCompraResponse {
  id: string;
  valorCentavos: number;
  status: string;
  createdAt: string;
  usuario: { nome: string };
  livro: { titulo: string };
}

function toBook(livro: LivroResponse): Book {
  return {
    id: livro.id,
    title: livro.titulo,
    author: livro.autor.nome,
    genre: livro.genero.nome,
    year: livro.ano,
    price: livro.precoCentavos / 100,
    synopsis: livro.sinopse,
    rating: livro.avaliacao,
    reviews: livro.totalAvaliacoes,
    coverFrom: livro.capaCorInicio,
    coverTo: livro.capaCorFim,
    coverText: livro.capaCorTexto,
    available: livro.disponivel,
    format: livro.formato,
    active: livro.ativo,
  };
}

// Faz a requisição e devolve a resposta crua (já checada); request() lê como JSON.
async function send(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<Response> {
  const { auth, ...options } = init;
  const token = auth ? getToken() : null;
  // Com FormData o navegador monta o Content-Type (multipart) sozinho.
  const isForm = options.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(!isForm && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor.");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(translateError(res.status, body.message));
  }
  return res;
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  return (await send(path, init)).json() as Promise<T>;
}

// Mensagens padrão do Nest (em inglês) que não devem aparecer para o usuário.
const NEST_DEFAULTS = ["Forbidden resource", "Unauthorized", "File too large"];

function translateError(status: number, message: unknown) {
  if (message === "User already exist") return "Já existe uma conta com este e-mail.";
  if (message === "User is not active") return "Esta conta está desativada.";
  if (message === "credentials are not valid") return "E-mail ou senha inválidos.";
  if (status === 401) return "Sua sessão expirou. Entre novamente.";
  if (status === 413) return "O arquivo é grande demais (máximo de 50 MB).";
  // Os módulos de livros, compras e leitura já respondem em português.
  const ownMessage =
    typeof message === "string" &&
    !message.startsWith("Validation") &&
    !NEST_DEFAULTS.includes(message);
  if (ownMessage && [400, 403, 404, 409].includes(status)) return `${message}.`;
  if (status === 403) return "Você não tem permissão para esta ação.";
  if (status === 400) return "Verifique os dados informados.";
  return "Algo deu errado. Tente novamente.";
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Sem storage disponível: a sessão dura só enquanto a página estiver aberta.
  }
}

export async function fetchMe(token: string): Promise<AppUser> {
  const me = await request<MeResponse>("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    id: me.id,
    name: me.nome,
    email: me.conta.email,
    role: me.tipoUsuario === "admin" ? "admin" : "client",
  };
}

export async function signIn(email: string, password: string) {
  const { accessToken } = await request<{ accessToken: string }>("/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(accessToken);
  return fetchMe(accessToken);
}

export async function signUp(name: string, email: string, password: string) {
  const { accessToken } = await request<{ accessToken: string }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  setToken(accessToken);
  return fetchMe(accessToken);
}

export function signOut() {
  setToken(null);
}

// ── Catálogo (público) ────────────────────────────────────────────────────────

export async function fetchBooks() {
  return (await request<LivroResponse[]>("/livros")).map(toBook);
}

export async function fetchGenres() {
  return (await request<{ nome: string }[]>("/livros/generos")).map((g) => g.nome);
}

// ── Compras do cliente ────────────────────────────────────────────────────────

// Livros comprados pelo usuário logado (a "Minha Biblioteca").
export async function fetchLibrary() {
  const compras = await request<CompraResponse[]>("/compras", { auth: true });
  return compras.map((c) => toBook(c.livro));
}

export async function buyBook(bookId: string) {
  const compra = await request<CompraResponse>("/compras", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ livroId: bookId }),
  });
  return toBook(compra.livro);
}

// ── Administração ─────────────────────────────────────────────────────────────

export async function fetchAdminBooks() {
  return (await request<LivroResponse[]>("/admin/livros", { auth: true })).map(toBook);
}

// Dados do formulário de livro do admin, no formato que a API espera.
export interface BookInput {
  titulo: string;
  autor: string;
  genero: string;
  sinopse: string;
  ano: number;
  precoCentavos: number;
  formato: string;
  disponivel: boolean;
  ativo: boolean;
  capaCorInicio: string;
  capaCorFim: string;
  capaCorTexto: string;
}

export async function createBook(data: BookInput) {
  const livro = await request<LivroResponse>("/admin/livros", {
    method: "POST",
    auth: true,
    body: JSON.stringify(data),
  });
  return toBook(livro);
}

export async function updateBook(bookId: string, data: BookInput) {
  const livro = await request<LivroResponse>(`/admin/livros/${bookId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(data),
  });
  return toBook(livro);
}

// ── Arquivos digitais e leitura ───────────────────────────────────────────────

export type BookFileFormat = "PDF" | "EPUB";

export interface BookFile {
  format: BookFileFormat;
  fileName: string;
  sizeBytes: number;
}

// Formatos que o usuário logado pode ler (a API recusa se ele não comprou).
export async function fetchReadingFormats(bookId: string) {
  const r = await request<{ formatos: BookFileFormat[] }>(`/leitura/${bookId}`, { auth: true });
  return r.formatos;
}

// Baixa o arquivo com o token; não existe link público para o conteúdo.
export async function fetchBookContent(bookId: string, format: BookFileFormat) {
  const res = await send(`/leitura/${bookId}/${format}`, { auth: true });
  return res.arrayBuffer();
}

export interface ReadingProgress {
  format: BookFileFormat;
  // Página do PDF ("12") ou CFI do EPUB.
  position: string;
  percent: number;
}

// Progresso salvo de cada formato, do mais recente para o mais antigo.
export async function fetchReadingProgress(bookId: string): Promise<ReadingProgress[]> {
  const r = await request<{ formato: BookFileFormat; posicao: string; percentual: number }[]>(
    `/leitura/${bookId}/progresso`,
    { auth: true },
  );
  return r.map((p) => ({ format: p.formato, position: p.posicao, percent: p.percentual }));
}

// keepalive deixa a requisição terminar mesmo se a aba for fechada.
export async function saveReadingProgress(
  bookId: string,
  progress: ReadingProgress,
  keepalive = false,
) {
  await send(`/leitura/${bookId}/progresso`, {
    method: "PUT",
    auth: true,
    keepalive,
    body: JSON.stringify({
      formato: progress.format,
      posicao: progress.position,
      percentual: Math.max(0, Math.min(100, Math.round(progress.percent))),
    }),
  });
}

// Baixa o arquivo com o token e entrega ao navegador como download,
// com o nome do livro (ex.: "Dom Casmurro.pdf").
export async function downloadBook(bookId: string, format: BookFileFormat, title: string) {
  const res = await send(`/leitura/${bookId}/${format}/download`, { auth: true });
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title}.${format.toLowerCase()}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Dá tempo ao navegador de começar o download antes de liberar a memória.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ── Avaliações ────────────────────────────────────────────────────────────────

interface AvaliacaoResponse {
  id: string;
  nota: number;
  comentario: string | null;
  updatedAt: string;
  usuario: { nome: string };
}

function toReview(a: AvaliacaoResponse): Review {
  return {
    id: a.id,
    rating: a.nota,
    comment: a.comentario,
    author: a.usuario.nome,
    date: new Date(a.updatedAt).toLocaleDateString("pt-BR"),
  };
}

// Avaliações públicas do livro, das mais recentes para as mais antigas.
export async function fetchReviews(bookId: string) {
  const r = await request<AvaliacaoResponse[]>(`/livros/${bookId}/avaliacoes`);
  return r.map(toReview);
}

// A avaliação do usuário logado, ou null se ele ainda não avaliou.
export async function fetchMyReview(bookId: string) {
  const r = await request<{ avaliacao: AvaliacaoResponse | null }>(
    `/livros/${bookId}/avaliacoes/minha`,
    { auth: true },
  );
  return r.avaliacao && toReview(r.avaliacao);
}

// Só quem comprou o livro pode avaliar; avaliar de novo substitui a anterior.
export async function saveMyReview(bookId: string, rating: number, comment: string) {
  const r = await request<AvaliacaoResponse>(`/livros/${bookId}/avaliacoes/minha`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ nota: rating, comentario: comment }),
  });
  return toReview(r);
}

export async function deleteMyReview(bookId: string) {
  await send(`/livros/${bookId}/avaliacoes/minha`, { method: "DELETE", auth: true });
}

// Moderação do admin.
export async function deleteReview(reviewId: string) {
  await send(`/admin/avaliacoes/${reviewId}`, { method: "DELETE", auth: true });
}

export async function fetchBookFiles(bookId: string): Promise<BookFile[]> {
  const arquivos = await request<
    { formato: BookFileFormat; nomeOriginal: string; tamanhoBytes: number }[]
  >(`/admin/livros/${bookId}/arquivos`, { auth: true });
  return arquivos.map((a) => ({
    format: a.formato,
    fileName: a.nomeOriginal,
    sizeBytes: a.tamanhoBytes,
  }));
}

// O formato (PDF ou EPUB) é detectado pela API; reenviar substitui o anterior.
export async function uploadBookFile(bookId: string, file: File) {
  const form = new FormData();
  form.append("arquivo", file);
  await send(`/admin/livros/${bookId}/arquivos`, { method: "POST", auth: true, body: form });
}

export async function deleteBookFile(bookId: string, format: BookFileFormat) {
  await send(`/admin/livros/${bookId}/arquivos/${format}`, { method: "DELETE", auth: true });
}

export async function setBookActive(bookId: string, active: boolean) {
  const livro = await request<LivroResponse>(`/admin/livros/${bookId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ ativo: active }),
  });
  return toBook(livro);
}

export async function fetchAdminSummary(): Promise<AdminSummary> {
  const r = await request<{
    livrosAtivos: number;
    compras: number;
    clientes: number;
    receitaCentavos: number;
  }>("/admin/resumo", { auth: true });
  return {
    activeBooks: r.livrosAtivos,
    purchases: r.compras,
    clients: r.clientes,
    revenue: r.receitaCentavos / 100,
  };
}

export async function fetchAdminPurchases(): Promise<AdminPurchase[]> {
  const compras = await request<AdminCompraResponse[]>("/admin/compras", { auth: true });
  return compras.map((c) => ({
    id: c.id,
    client: c.usuario.nome,
    book: c.livro.titulo,
    date: new Date(c.createdAt).toLocaleDateString("pt-BR"),
    value: c.valorCentavos / 100,
    status: c.status,
  }));
}
