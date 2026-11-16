import { useState } from "react";
import { Search, BookOpen } from "lucide-react";
import type { Book } from "../types";
import { BookCard } from "../components/BookCard";

export function CatalogView({
  books,
  genres,
  onSelectBook,
  searchQuery,
  onSearch,
  purchasedIds,
}: {
  books: Book[];
  genres: string[];
  onSelectBook: (b: Book) => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  purchasedIds: Set<string>;
}) {
  const [genre, setGenre] = useState("Todos");
  const [price, setPrice] = useState("Todos");
  const [sort, setSort] = useState("Relevância");

  const visible = books.filter((b) => {
    if (!b.active) return false;
    const q = searchQuery.toLowerCase();
    const matchQ =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.genre.toLowerCase().includes(q);
    const matchG = genre === "Todos" || b.genre === genre;
    const matchP =
      price === "Todos" ||
      (price === "Até R$ 20" && b.price <= 20) ||
      (price === "R$ 20–30" && b.price > 20 && b.price <= 30) ||
      (price === "Acima de R$ 30" && b.price > 30);
    return matchQ && matchG && matchP;
  }).sort((a, b) => {
    if (sort === "Menor preço") return a.price - b.price;
    if (sort === "Maior preço") return b.price - a.price;
    if (sort === "Avaliação") return b.rating - a.rating;
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1
          className="text-2xl md:text-3xl font-bold text-[#1F3D33]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Catálogo
        </h1>
        <p className="text-sm text-[#7A7264] mt-1">
          {visible.length} obra{visible.length !== 1 ? "s" : ""} encontrada
          {visible.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6 pb-5 border-b border-[rgba(49,92,76,0.1)]">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7264]" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[rgba(49,92,76,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#315C4C]/20 focus:border-[#315C4C] text-[#292824] placeholder-[#7A7264]"
          />
        </div>
        {(
          [
            {
              label: "Gênero",
              val: genre,
              set: setGenre,
              opts: ["Todos", ...genres],
            },
            {
              label: "Preço",
              val: price,
              set: setPrice,
              opts: ["Todos", "Até R$ 20", "R$ 20–30", "Acima de R$ 30"],
            },
            {
              label: "Ordenar",
              val: sort,
              set: setSort,
              opts: ["Relevância", "Avaliação", "Menor preço", "Maior preço"],
            },
          ] as const
        ).map(({ label, val, set, opts }) => (
          <select
            key={label}
            value={val}
            onChange={(e) => (set as (v: string) => void)(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-[rgba(49,92,76,0.15)] rounded-lg text-[#292824] focus:outline-none focus:ring-2 focus:ring-[#315C4C]/20 focus:border-[#315C4C]"
          >
            {opts.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#292824]">
            Nenhum livro encontrado
          </h3>
          <p className="text-sm text-[#7A7264] mt-1">
            Tente outros termos ou remova os filtros.
          </p>
          <button
            onClick={() => {
              onSearch("");
              setGenre("Todos");
              setPrice("Todos");
            }}
            className="mt-4 px-4 py-2 text-sm text-[#315C4C] border border-[rgba(49,92,76,0.2)] rounded-lg hover:bg-[rgba(49,92,76,0.05)] transition-colors"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={onSelectBook}
              purchased={purchasedIds.has(book.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
