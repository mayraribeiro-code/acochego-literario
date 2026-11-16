import { useEffect, useState } from "react";
import { BookOpen, Library, Check } from "lucide-react";
import type { Book } from "../types";
import { fetchLibraryProgress } from "../lib/api";
import { Stars } from "../components/Stars";
import { BookCover } from "../components/BookCover";
import { DownloadButton } from "../components/DownloadButton";

type Progress = Awaited<ReturnType<typeof fetchLibraryProgress>>;

export function LibraryView({
  myBooks,
  onRead,
  onSelectBook,
  onExplore,
  onMessage,
  readerOpen,
}: {
  myBooks: Book[];
  onRead: (b: Book) => void;
  onSelectBook: (b: Book) => void;
  onExplore: () => void;
  onMessage: (message: string) => void;
  readerOpen: boolean;
}) {
  const [progress, setProgress] = useState<Progress>({});

  // Recarrega ao entrar na biblioteca, quando a lista de livros muda (ex.:
  // depois de uma compra) e quando o leitor fecha. A espera curta dá tempo do
  // leitor terminar de salvar a última posição. Sem progresso, o card só não
  // mostra a barra.
  useEffect(() => {
    if (readerOpen) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchLibraryProgress()
        .then((p) => !cancelled && setProgress(p))
        .catch(() => {});
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [myBooks.length, readerOpen]);

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
          <button
            onClick={onExplore}
            className="mt-5 px-4 py-2 bg-[#315C4C] text-white text-sm font-semibold rounded-lg hover:bg-[#1F3D33] transition-colors"
          >
            Explorar o catálogo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myBooks.map((book) => {
            const p = progress[book.id];
            const finished = p && p.percent >= 100;
            return (
              <article
                key={book.id}
                className="bg-white rounded-xl border border-[rgba(49,92,76,0.08)] shadow-sm overflow-hidden flex flex-col"
              >
                <div className="p-4 flex gap-4 flex-1">
                  <button
                    onClick={() => onSelectBook(book)}
                    className="flex-shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#315C4C]"
                    aria-label={`Ver detalhes de ${book.title}`}
                  >
                    <BookCover book={book} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onSelectBook(book)}
                      className="text-left font-semibold text-[#292824] leading-snug line-clamp-2 text-sm hover:text-[#315C4C] transition-colors"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {book.title}
                    </button>
                    <p className="text-xs text-[#7A7264] mt-0.5">{book.author}</p>
                    <Stars rating={book.rating} />
                    {p ? (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-[#7A7264] mb-1">
                          <span>{finished ? "Leitura concluída" : `${p.percent}% lido`}</span>
                          <span>{p.format}</span>
                        </div>
                        <div
                          className="h-1.5 bg-[#EAE5D8] rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={p.percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progresso de leitura de ${book.title}`}
                        >
                          <div
                            className="h-full bg-[#315C4C] rounded-full"
                            style={{ width: `${Math.min(p.percent, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium mt-2">
                        <Check className="w-3 h-3" /> Adquirido
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => onRead(book)}
                    className="flex-1 py-2 bg-[#315C4C] text-white text-xs font-semibold rounded-lg hover:bg-[#1F3D33] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {p && !finished ? "Continuar" : finished ? "Ler de novo" : "Ler"}
                  </button>
                  <DownloadButton book={book} size="sm" onMessage={onMessage} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
