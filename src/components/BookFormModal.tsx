import { useState } from "react";
import { X } from "lucide-react";
import type { Book } from "../types";
import { ApiError, createBook, updateBook, type BookInput } from "../lib/api";
import { BookCover } from "./BookCover";
import { BookFilesSection } from "./BookFilesSection";

const FORMATS = ["PDF", "EPUB", "PDF + EPUB"];

const inputCls =
  "w-full px-3 py-2.5 text-sm bg-[#F7F3EA] border border-[rgba(49,92,76,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#315C4C]/20 focus:border-[#315C4C] text-[#292824] placeholder-[#7A7264] transition-all";
const labelCls = "block text-sm font-medium text-[#292824] mb-1.5";

interface FormState {
  title: string;
  author: string;
  genre: string;
  synopsis: string;
  year: string;
  price: string;
  format: string;
  available: boolean;
  active: boolean;
  coverFrom: string;
  coverTo: string;
  coverText: string;
}

function initialState(book: Book | null): FormState {
  if (!book) {
    return {
      title: "",
      author: "",
      genre: "",
      synopsis: "",
      year: "",
      price: "",
      format: "PDF + EPUB",
      available: true,
      active: true,
      coverFrom: "#1F3D33",
      coverTo: "#315C4C",
      coverText: "#C6A15B",
    };
  }
  return {
    title: book.title,
    author: book.author,
    genre: book.genre,
    synopsis: book.synopsis,
    year: String(book.year),
    price: book.price.toFixed(2).replace(".", ","),
    format: book.format,
    available: book.available,
    active: book.active,
    coverFrom: book.coverFrom,
    coverTo: book.coverTo,
    coverText: book.coverText,
  };
}

// Aceita "19,90" ou "19.90"; devolve null se não for um valor válido.
function parsePriceToCents(value: string) {
  const n = Number(value.trim().replace(",", "."));
  return value.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

function validate(f: FormState): string | null {
  if (!f.title.trim() || !f.author.trim() || !f.genre.trim() || !f.synopsis.trim()) {
    return "Preencha título, autor, gênero e sinopse.";
  }
  const year = Number(f.year);
  if (!Number.isInteger(year) || year < 0 || year > 9999) {
    return "Informe um ano válido.";
  }
  if (parsePriceToCents(f.price) === null) {
    return "Informe um preço válido, por exemplo 19,90.";
  }
  return null;
}

export function BookFormModal({
  book,
  authors,
  genres,
  onClose,
  onSaved,
}: {
  // null = cadastrar um livro novo
  book: Book | null;
  authors: string[];
  genres: string[];
  onClose: () => void;
  onSaved: (book: Book, created: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(book));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const invalid = validate(form);
    if (invalid) {
      setError(invalid);
      return;
    }

    const data: BookInput = {
      titulo: form.title.trim(),
      autor: form.author.trim(),
      genero: form.genre.trim(),
      sinopse: form.synopsis.trim(),
      ano: Number(form.year),
      precoCentavos: parsePriceToCents(form.price)!,
      formato: form.format,
      disponivel: form.available,
      ativo: form.active,
      capaCorInicio: form.coverFrom,
      capaCorFim: form.coverTo,
      capaCorTexto: form.coverText,
    };

    setLoading(true);
    try {
      const saved = book ? await updateBook(book.id, data) : await createBook(data);
      onSaved(saved, !book);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo deu errado. Tente novamente.");
      setLoading(false);
    }
  }

  // Livro "de mentira" só para desenhar a prévia da capa enquanto o admin digita.
  const preview: Book = {
    id: "preview",
    title: form.title || "Título do livro",
    author: form.author || "Autor",
    genre: form.genre,
    year: Number(form.year) || 0,
    price: 0,
    synopsis: "",
    rating: 0,
    reviews: 0,
    coverFrom: form.coverFrom,
    coverTo: form.coverTo,
    coverText: form.coverText,
    available: form.available,
    format: form.format,
    active: form.active,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <form onSubmit={handleSubmit} className="p-6">
          <h2
            className="text-xl font-bold text-[#1F3D33] mb-1 pr-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {book ? "Editar livro" : "Novo livro"}
          </h2>
          <p className="text-sm text-[#7A7264] mb-5">
            {book
              ? "Altere as informações da obra no catálogo."
              : "Cadastre uma nova obra no catálogo."}
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="bf-title" className={labelCls}>Título</label>
              <input id="bf-title" className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Dom Casmurro" />
            </div>

            <div>
              <label htmlFor="bf-author" className={labelCls}>Autor</label>
              <input id="bf-author" list="bf-authors" className={inputCls} value={form.author} onChange={(e) => set("author", e.target.value)} placeholder="Nome do autor" />
              <datalist id="bf-authors">
                {authors.map((a) => <option key={a} value={a} />)}
              </datalist>
            </div>

            <div>
              <label htmlFor="bf-genre" className={labelCls}>Gênero</label>
              <input id="bf-genre" list="bf-genres" className={inputCls} value={form.genre} onChange={(e) => set("genre", e.target.value)} placeholder="Ex.: Romance" />
              <datalist id="bf-genres">
                {genres.map((g) => <option key={g} value={g} />)}
              </datalist>
            </div>

            <div>
              <label htmlFor="bf-year" className={labelCls}>Ano</label>
              <input id="bf-year" type="number" inputMode="numeric" className={inputCls} value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="1899" />
            </div>

            <div>
              <label htmlFor="bf-price" className={labelCls}>Preço (R$)</label>
              <input id="bf-price" inputMode="decimal" className={inputCls} value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="19,90" />
            </div>

            <div>
              <label htmlFor="bf-format" className={labelCls}>Formato</label>
              <select id="bf-format" className={inputCls} value={form.format} onChange={(e) => set("format", e.target.value)}>
                {FORMATS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>

            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm font-normal text-[#292824]">
                <input type="checkbox" className="accent-[#315C4C] w-4 h-4" checked={form.available} onChange={(e) => set("available", e.target.checked)} />
                Disponível para compra
              </label>
              <label className="flex items-center gap-2 text-sm font-normal text-[#292824]">
                <input type="checkbox" className="accent-[#315C4C] w-4 h-4" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
                Ativo no catálogo
              </label>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="bf-synopsis" className={labelCls}>Sinopse</label>
              <textarea id="bf-synopsis" rows={4} className={`${inputCls} resize-y`} value={form.synopsis} onChange={(e) => set("synopsis", e.target.value)} placeholder="Do que trata a obra..." />
            </div>

            <div className="sm:col-span-2">
              <p className={labelCls}>Capa</p>
              <div className="flex gap-4 items-center bg-[#F7F3EA] rounded-xl p-4">
                <BookCover book={preview} w="w-20" h="h-30" />
                <div className="grid grid-cols-3 gap-3 flex-1">
                  {(
                    [
                      ["coverFrom", "Cor 1"],
                      ["coverTo", "Cor 2"],
                      ["coverText", "Texto"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="text-xs font-medium text-[#7A7264]">
                      {label}
                      <input
                        type="color"
                        value={form[key]}
                        onChange={(e) => set(key, e.target.value.toUpperCase())}
                        className="mt-1 block w-full h-9 rounded-lg border border-[rgba(49,92,76,0.15)] bg-white cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className={labelCls}>Arquivos digitais</p>
              {book ? (
                <BookFilesSection bookId={book.id} />
              ) : (
                <p className="text-sm text-[#7A7264] bg-[#F7F3EA] rounded-xl p-4">
                  Depois de cadastrar o livro, abra "Editar" para enviar o PDF ou EPUB.
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-5">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-[#7A7264] hover:text-[#292824] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#315C4C] text-white text-sm font-semibold rounded-lg hover:bg-[#1F3D33] transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {book ? "Salvar alterações" : "Cadastrar livro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
