import { Search, BookOpen, ChevronRight } from "lucide-react";
import type { Book, View } from "../types";
import { fmt } from "../lib/format";
import { Stars } from "../components/Stars";
import { BookCard } from "../components/BookCard";

export function HomeView({
  books,
  genres,
  onNavigate,
  onSelectBook,
}: {
  books: Book[];
  genres: string[];
  onNavigate: (v: View) => void;
  onSelectBook: (b: Book) => void;
}) {
  const featured = books.filter((b) => b.available && b.active).slice(0, 4);
  const newArrivals = books.slice(4, 8);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[420px] md:min-h-[500px] flex items-center">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1600&h=700&fit=crop&auto=format"
            alt="Estantes de biblioteca"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(31,61,51,0.93) 0%, rgba(49,92,76,0.87) 55%, rgba(31,61,51,0.72) 100%)",
            }}
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 text-xs px-3 py-1.5 rounded-full mb-5 border border-white/20">
              <BookOpen className="w-3.5 h-3.5" />
              Biblioteca digital pessoal
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Um lugar tranquilo para descobrir livros.
            </h1>
            <p className="text-base md:text-lg text-white/80 mb-8 leading-relaxed">
              Explore um catálogo cuidadosamente organizado. Adquira livros
              digitais e leve sua biblioteca aonde for.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onNavigate("catalog")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#C6A15B] text-[#1F3D33] text-sm font-bold rounded-xl hover:bg-[#D4B48A] transition-colors shadow-lg"
              >
                Explorar o catálogo
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate("catalog")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/15 text-white text-sm font-semibold rounded-xl hover:bg-white/25 transition-colors border border-white/30 backdrop-blur-sm"
              >
                <Search className="w-4 h-4" />
                Pesquisar livros
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Genre pills */}
      <section className="bg-white border-b border-[rgba(49,92,76,0.1)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="text-sm text-[#7A7264] flex-shrink-0 font-medium">
              Gêneros:
            </span>
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => onNavigate("catalog")}
                className="flex-shrink-0 text-sm px-3 py-1 rounded-full border border-[rgba(49,92,76,0.2)] text-[#315C4C] hover:bg-[#315C4C] hover:text-white hover:border-[#315C4C] transition-all"
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured books grid */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2
                className="text-2xl md:text-3xl font-bold text-[#1F3D33]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Destaques literários
              </h2>
              <p className="text-sm text-[#7A7264] mt-1">
                Obras selecionadas do nosso acervo
              </p>
            </div>
            <button
              onClick={() => onNavigate("catalog")}
              className="text-sm text-[#315C4C] font-medium hover:underline flex items-center gap-1 flex-shrink-0"
            >
              Ver todos <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featured.map((book) => (
              <div
                key={book.id}
                onClick={() => onSelectBook(book)}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-xl shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1.5 aspect-[2/3]">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(155deg, ${book.coverFrom}, ${book.coverTo})`,
                    }}
                  />
                  <div className="absolute left-0 top-0 bottom-0 w-2 opacity-40" style={{ background: book.coverText }} />
                  <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-between">
                    <h3
                      className="text-sm md:text-base font-bold leading-snug"
                      style={{
                        color: book.coverText,
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      {book.title}
                    </h3>
                    <div>
                      <div
                        className="h-px mb-2.5 opacity-40"
                        style={{ background: book.coverText }}
                      />
                      <p
                        className="text-xs md:text-sm opacity-80"
                        style={{ color: book.coverText }}
                      >
                        {book.author}
                      </p>
                      <p
                        className="text-xs opacity-55 mt-0.5"
                        style={{ color: book.coverText }}
                      >
                        {book.year}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5">
                  <p
                    className="text-sm font-medium text-[#292824] group-hover:text-[#315C4C] transition-colors leading-snug line-clamp-1"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {book.title}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      <Stars rating={book.rating} />
                      <span className="text-xs text-[#7A7264]">
                        {book.rating}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-[#315C4C]">
                      {fmt(book.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote banner */}
      <section className="py-10 bg-[#1F3D33]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <blockquote
            className="text-white/90 italic text-lg md:text-xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            "Livros são espelhos: só vemos neles o que já temos dentro de nós."
          </blockquote>
          <p className="text-[#C6A15B] text-sm mt-2.5">— Carlos Ruiz Zafón</p>
        </div>
      </section>

      {/* New arrivals */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2
                className="text-2xl md:text-3xl font-bold text-[#1F3D33]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Novidades do catálogo
              </h2>
              <p className="text-sm text-[#7A7264] mt-1">
                Obras recém chegadas à biblioteca
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {newArrivals.map((book) => (
              <BookCard key={book.id} book={book} onSelect={onSelectBook} />
            ))}
          </div>
          <div className="text-center mt-8">
            <button
              onClick={() => onNavigate("catalog")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[rgba(49,92,76,0.2)] text-[#315C4C] text-sm font-semibold rounded-xl hover:bg-[#315C4C] hover:text-white hover:border-[#315C4C] transition-all shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              Ver catálogo completo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1F3D33] py-10 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span
                className="font-bold text-white text-lg"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Aconchego Literário
              </span>
            </div>
            <p className="text-white/45 text-sm text-center">
              Sua biblioteca digital pessoal. Descubra, adquira e leia.
            </p>
            <p className="text-white/25 text-xs">© 2025 Aconchego Literário</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
