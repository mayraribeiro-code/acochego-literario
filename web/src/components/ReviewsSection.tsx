import { useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import type { AppUser, Book, Review } from "../types";
import {
  ApiError,
  deleteMyReview,
  deleteReview,
  fetchMyReview,
  fetchReviews,
  saveMyReview,
} from "../lib/api";
import { Stars } from "./Stars";

const MAX_COMMENT = 2000;
const LABELS = ["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"];

// Avaliações do livro: lista pública e, para quem comprou, o formulário
// para dar (ou mudar) a própria nota. O admin pode remover avaliações.
export function ReviewsSection({
  book,
  currentUser,
  purchased,
  onChange,
  onMessage,
}: {
  book: Book;
  currentUser: AppUser | null;
  purchased: boolean;
  onChange: () => void;
  onMessage: (message: string) => void;
}) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mine, setMine] = useState<Review | null>(null);

  const canReview = purchased && currentUser?.role === "client";
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    setReviews(null);
    setPage(1);
    setFailed(false);
    fetchReviews(book.id)
      .then((r) => {
        if (cancelled) return;
        setReviews(r.items);
        setTotal(r.total);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [book.id]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const r = await fetchReviews(book.id, page + 1);
      // Se alguém avaliou nesse meio-tempo, a página seguinte pode repetir itens.
      setReviews((list) => {
        const seen = new Set((list ?? []).map((x) => x.id));
        return [...(list ?? []), ...r.items.filter((x) => !seen.has(x.id))];
      });
      setTotal(r.total);
      setPage((p) => p + 1);
    } catch (err) {
      onMessage(err instanceof ApiError ? err.message : "Não foi possível carregar mais avaliações.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setMine(null);
    if (!canReview) return;
    fetchMyReview(book.id)
      .then((r) => !cancelled && setMine(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [book.id, canReview]);

  function applyMine(review: Review | null) {
    const previousId = mine?.id;
    if (!previousId && review) setTotal((t) => t + 1);
    if (previousId && !review) setTotal((t) => t - 1);
    setMine(review);
    setReviews((list) => {
      const others = (list ?? []).filter((r) => r.id !== previousId);
      return review ? [review, ...others] : others;
    });
    onChange();
  }

  async function removeAsAdmin(review: Review) {
    try {
      await deleteReview(review.id);
      setReviews((list) => (list ?? []).filter((r) => r.id !== review.id));
      setTotal((t) => t - 1);
      onChange();
      onMessage("Avaliação removida.");
    } catch (err) {
      onMessage(err instanceof ApiError ? err.message : "Não foi possível remover.");
    }
  }

  const others = (reviews ?? []).filter((r) => r.id !== mine?.id);

  return (
    <section className="mt-10">
      <h2
        className="text-lg font-bold text-[#1F3D33] mb-4"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Avaliações dos leitores
      </h2>

      {canReview && (
        <ReviewForm
          bookId={book.id}
          mine={mine}
          onSaved={applyMine}
          onMessage={onMessage}
        />
      )}

      {failed ? (
        <p className="text-sm text-[#7A7264]">Não foi possível carregar as avaliações.</p>
      ) : reviews === null ? (
        <div className="w-6 h-6 border-2 border-[#315C4C]/20 border-t-[#315C4C] rounded-full animate-spin" />
      ) : others.length === 0 && !mine ? (
        <p className="text-sm text-[#7A7264]">
          Este livro ainda não tem avaliações.
          {!canReview && " Quem compra o livro pode avaliá-lo."}
        </p>
      ) : (
        <ul className="space-y-3">
          {others.map((r) => (
            <li
              key={r.id}
              className="bg-white rounded-xl border border-[rgba(49,92,76,0.1)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#292824] truncate">{r.author}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Stars rating={r.rating} />
                    <span className="text-xs text-[#7A7264]">{r.date}</span>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => removeAsAdmin(r)}
                    className="flex-shrink-0 p-1.5 text-stone-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                    aria-label={`Remover avaliação de ${r.author}`}
                    title="Remover avaliação"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {r.comment && (
                <p className="text-sm text-[#292824] leading-relaxed mt-2 whitespace-pre-line break-words">
                  {r.comment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {reviews !== null && reviews.length < total && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-4 px-4 py-2 text-sm font-semibold text-[#315C4C] bg-white border border-[rgba(49,92,76,0.2)] rounded-lg hover:bg-[rgba(49,92,76,0.05)] transition-colors disabled:opacity-60"
        >
          {loadingMore ? "Carregando…" : `Ver mais avaliações (${total - reviews.length})`}
        </button>
      )}
    </section>
  );
}

function ReviewForm({
  bookId,
  mine,
  onSaved,
  onMessage,
}: {
  bookId: string;
  mine: Review | null;
  onSaved: (review: Review | null) => void;
  onMessage: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  // Ao carregar a avaliação existente (ou trocar de livro), preenche o formulário.
  useEffect(() => {
    setRating(mine?.rating ?? 0);
    setComment(mine?.comment ?? "");
    setEditing(false);
  }, [mine?.id, bookId]);

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      onMessage(err instanceof ApiError ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) {
      onMessage("Escolha de 1 a 5 estrelas.");
      return;
    }
    run(async () => {
      const saved = await saveMyReview(bookId, rating, comment);
      onSaved(saved);
      setEditing(false);
      onMessage(mine ? "Avaliação atualizada." : "Obrigado pela sua avaliação!");
    }, "Não foi possível salvar a avaliação.");
  }

  function remove() {
    run(async () => {
      await deleteMyReview(bookId);
      onSaved(null);
      onMessage("Sua avaliação foi removida.");
    }, "Não foi possível remover a avaliação.");
  }

  const box = "bg-[#F7F3EA] rounded-xl border border-[rgba(198,161,91,0.3)] p-4 mb-5";

  if (mine && !editing) {
    return (
      <div className={box}>
        <p className="text-xs text-[#7A7264] font-medium uppercase tracking-wide">
          Sua avaliação
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <Stars rating={mine.rating} size="md" />
          <span className="text-xs text-[#7A7264]">{mine.date}</span>
        </div>
        {mine.comment && (
          <p className="text-sm text-[#292824] leading-relaxed mt-2 whitespace-pre-line break-words">
            {mine.comment}
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 bg-white border border-[rgba(49,92,76,0.2)] text-[#315C4C] text-xs font-semibold rounded-lg hover:bg-[rgba(49,92,76,0.05)] transition-colors"
          >
            Editar
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="px-3 py-1.5 text-xs font-semibold text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            Remover
          </button>
        </div>
      </div>
    );
  }

  const shown = hover || rating;

  return (
    <form onSubmit={submit} className={box}>
      <p className="text-sm font-semibold text-[#292824]">
        {mine ? "Editar sua avaliação" : "O que você achou deste livro?"}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex" role="radiogroup" aria-label="Nota" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} de 5 estrelas`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="p-0.5"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  n <= shown ? "fill-[#C6A15B] text-[#C6A15B]" : "text-stone-300"
                }`}
              />
            </button>
          ))}
        </div>
        <span className="text-sm text-[#7A7264]">{LABELS[shown]}</span>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={MAX_COMMENT}
        rows={3}
        placeholder="Conte o que achou (opcional)"
        className="mt-3 w-full px-3 py-2 text-sm bg-white border border-[rgba(49,92,76,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#315C4C]/20 focus:border-[#315C4C] resize-y"
      />
      <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
        <span className="text-xs text-[#7A7264]">
          {comment.length}/{MAX_COMMENT}
        </span>
        <div className="flex gap-2">
          {mine && (
            <button
              type="button"
              onClick={() => {
                setRating(mine.rating);
                setComment(mine.comment ?? "");
                setEditing(false);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-[#7A7264] rounded-lg hover:bg-white transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-1.5 bg-[#315C4C] text-white text-xs font-semibold rounded-lg hover:bg-[#1F3D33] transition-colors disabled:opacity-60"
          >
            {busy ? "Salvando…" : mine ? "Salvar" : "Enviar avaliação"}
          </button>
        </div>
      </div>
    </form>
  );
}
