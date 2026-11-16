import { useState } from "react";
import { X, Check } from "lucide-react";
import type { Book } from "../types";
import { fmt } from "../lib/format";
import { ApiError, buyBook } from "../lib/api";
import { BookCover } from "./BookCover";

export function PurchaseModal({
  book,
  onClose,
  onConfirm,
}: {
  book: Book;
  onClose: () => void;
  onConfirm: (book: Book) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handlePurchase() {
    setError("");
    setLoading(true);
    try {
      const purchased = await buyBook(book.id);
      setDone(true);
      setTimeout(() => onConfirm(purchased), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={!loading && !done ? onClose : undefined}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        {!done && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {done ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-[#315C4C] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3
              className="text-lg font-bold text-[#1F3D33]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Compra confirmada!
            </h3>
            <p className="text-sm text-[#7A7264] mt-1">
              "{book.title}" foi adicionado à sua biblioteca.
            </p>
          </div>
        ) : (
          <>
            <h3
              className="text-lg font-bold text-[#1F3D33] mb-1 pr-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Confirmar compra
            </h3>
            <p className="text-sm text-[#7A7264] mb-5">
              Revise os detalhes antes de confirmar.
            </p>

            <div className="flex gap-4 bg-[#F7F3EA] rounded-xl p-4 mb-5">
              <BookCover book={book} w="w-16" h="h-24" />
              <div className="min-w-0">
                <p
                  className="font-semibold text-[#292824] text-sm leading-snug line-clamp-2"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {book.title}
                </p>
                <p className="text-xs text-[#7A7264] mt-0.5">{book.author}</p>
                <p className="text-xs text-[#7A7264] mt-1">{book.format}</p>
                <p className="text-[#315C4C] font-bold mt-2 text-base">
                  {fmt(book.price)}
                </p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">
                {error}
              </p>
            )}

            <button
              onClick={handlePurchase}
              disabled={loading}
              className="w-full py-2.5 bg-[#315C4C] text-white text-sm font-semibold rounded-xl hover:bg-[#1F3D33] transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-md"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? "Processando..." : `Comprar por ${fmt(book.price)}`}
            </button>
            <button
              onClick={onClose}
              className="w-full mt-2 py-2 text-sm text-[#7A7264] hover:text-[#292824] transition-colors"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
