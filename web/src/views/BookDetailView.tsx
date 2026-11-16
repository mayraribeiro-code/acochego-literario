import { BookOpen, Check, ArrowLeft, ShoppingBag } from "lucide-react";
import type { AppUser, AuthMode, Book } from "../types";
import { fmt } from "../lib/format";
import { Stars } from "../components/Stars";
import { GenreBadge } from "../components/GenreBadge";
import { DownloadButton } from "../components/DownloadButton";

export function BookDetailView({
  book,
  currentUser,
  purchased,
  onBack,
  onBuy,
  onOpenAuth,
  onRead,
  onMessage,
}: {
  book: Book;
  currentUser: AppUser | null;
  purchased: boolean;
  onBack: () => void;
  onBuy: (b: Book) => void;
  onOpenAuth: (m: AuthMode) => void;
  onRead: () => void;
  onMessage: (message: string) => void;
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-[#315C4C] hover:text-[#1F3D33] mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Voltar ao catálogo
      </button>

      <div className="grid md:grid-cols-[260px_1fr] gap-8 lg:gap-12">
        {/* Left column */}
        <div className="space-y-4">
          {/* Cover */}
          <div
            className="w-full aspect-[2/3] rounded-2xl shadow-2xl relative overflow-hidden"
            style={{
              background: `linear-gradient(155deg, ${book.coverFrom}, ${book.coverTo})`,
            }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-2.5 opacity-45"
              style={{ background: book.coverText }}
            />
            <div className="absolute inset-0 p-6 flex flex-col justify-between">
              <h3
                className="text-xl font-bold leading-tight"
                style={{
                  color: book.coverText,
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                {book.title}
              </h3>
              <div>
                <div
                  className="h-px mb-3 opacity-40"
                  style={{ background: book.coverText }}
                />
                <p
                  className="text-sm opacity-85"
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

          {/* Price & actions */}
          <div className="bg-white rounded-xl border border-[rgba(49,92,76,0.1)] p-5 shadow-sm">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-2xl font-bold text-[#315C4C]">
                {fmt(book.price)}
              </span>
              <span className="text-sm text-[#7A7264]">{book.format}</span>
            </div>

            {purchased ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[#315C4C] font-medium bg-emerald-50 px-3 py-2 rounded-lg">
                  <Check className="w-4 h-4" /> Na sua biblioteca
                </div>
                <button
                  onClick={onRead}
                  className="w-full py-2.5 bg-[#315C4C] text-white text-sm font-semibold rounded-lg hover:bg-[#1F3D33] transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <BookOpen className="w-4 h-4" /> Ler agora
                </button>
                <DownloadButton book={book} size="md" onMessage={onMessage} />
              </div>
            ) : (
              <>
                {book.available ? (
                  <button
                    onClick={() =>
                      currentUser ? onBuy(book) : onOpenAuth("login")
                    }
                    className="w-full py-3 bg-[#315C4C] text-white text-sm font-bold rounded-xl hover:bg-[#1F3D33] transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {currentUser ? "Comprar livro" : "Entrar para comprar"}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 bg-stone-100 text-stone-400 text-sm font-semibold rounded-xl cursor-not-allowed"
                  >
                    Em breve
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right column */}
        <div>
          <GenreBadge genre={book.genre} />
          <h1
            className="text-3xl md:text-4xl font-bold text-[#1F3D33] mt-3 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {book.title}
          </h1>
          <p className="text-lg text-[#7A7264] mt-1">{book.author}</p>
          <p className="text-sm text-[#7A7264] mt-0.5">{book.year}</p>

          <div className="flex items-center gap-3 mt-4 pb-5 border-b border-[rgba(49,92,76,0.1)]">
            <Stars rating={book.rating} size="md" />
            <span className="text-sm font-medium text-[#292824]">
              {book.rating}
            </span>
            <span className="text-sm text-[#7A7264]">
              ({book.reviews.toLocaleString("pt-BR")} avaliações)
            </span>
          </div>

          <div className="mt-6">
            <h2
              className="text-lg font-bold text-[#1F3D33] mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Sinopse
            </h2>
            <p className="text-[#292824] leading-relaxed text-base">
              {book.synopsis}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 bg-[#F7F3EA] rounded-xl p-5">
            {[
              { label: "Gênero", value: book.genre },
              { label: "Autor", value: book.author },
              { label: "Ano", value: String(book.year) },
              { label: "Formato", value: book.format },
              {
                label: "Disponibilidade",
                value: book.available ? "Disponível" : "Em breve",
              },
              { label: "Avaliação", value: `${book.rating} / 5.0` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-[#7A7264] font-medium uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-sm text-[#292824] font-medium mt-0.5">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {!currentUser && book.available && (
            <div className="mt-6 bg-white border border-[rgba(198,161,91,0.3)] rounded-xl p-4">
              <p className="text-sm text-[#292824]">
                Para adquirir este livro, é necessário ter uma conta no
                Aconchego Literário.
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => onOpenAuth("login")}
                  className="px-4 py-2 bg-[#315C4C] text-white text-sm font-semibold rounded-lg hover:bg-[#1F3D33] transition-colors"
                >
                  Entrar
                </button>
                <button
                  onClick={() => onOpenAuth("register")}
                  className="px-4 py-2 bg-white border border-[rgba(49,92,76,0.2)] text-[#315C4C] text-sm font-semibold rounded-lg hover:bg-[rgba(49,92,76,0.05)] transition-colors"
                >
                  Criar conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
