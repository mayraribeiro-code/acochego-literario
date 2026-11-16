import { BookOpen, Library, Download, Check } from "lucide-react";
import type { Book } from "../types";
import { Stars } from "../components/Stars";
import { BookCover } from "../components/BookCover";

export function LibraryView({
  myBooks,
  onRead,
}: {
  myBooks: Book[];
  onRead: (b: Book) => void;
}) {

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1
          className="text-2xl md:text-3xl font-bold text-[#1F3D33]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Minha Biblioteca
        </h1>
        <p className="text-sm text-[#7A7264] mt-1">
          {myBooks.length} livro{myBooks.length !== 1 ? "s" : ""} adquirido
          {myBooks.length !== 1 ? "s" : ""}
        </p>
      </div>

      {myBooks.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-[#F7F3EA] border border-[rgba(49,92,76,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Library className="w-9 h-9 text-[#315C4C]/40" />
          </div>
          <h3 className="text-lg font-semibold text-[#292824]">
            Sua biblioteca está vazia
          </h3>
          <p className="text-sm text-[#7A7264] mt-1 max-w-xs mx-auto">
            Explore o catálogo e adquira seus primeiros livros para começar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myBooks.map((book) => (
            <article
              key={book.id}
              className="bg-white rounded-xl border border-[rgba(49,92,76,0.08)] shadow-sm overflow-hidden"
            >
              <div className="p-4 flex gap-4">
                <BookCover book={book} />
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold text-[#292824] leading-snug line-clamp-2 text-sm"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {book.title}
                  </h3>
                  <p className="text-xs text-[#7A7264] mt-0.5">{book.author}</p>
                  <Stars rating={book.rating} />
                  <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium mt-2">
                    <Check className="w-3 h-3" /> Adquirido
                  </span>
                </div>
              </div>
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={() => onRead(book)}
                  className="flex-1 py-2 bg-[#315C4C] text-white text-xs font-semibold rounded-lg hover:bg-[#1F3D33] transition-colors flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Ler
                </button>
                {book.format.includes("PDF") && (
                  <button className="flex-1 py-2 bg-white border border-[rgba(49,92,76,0.15)] text-[#315C4C] text-xs font-semibold rounded-lg hover:bg-[rgba(49,92,76,0.05)] transition-colors flex items-center justify-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Baixar
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
