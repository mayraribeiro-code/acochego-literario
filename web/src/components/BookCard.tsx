import { Check } from "lucide-react";
import type { Book } from "../types";
import { fmt } from "../lib/format";
import { Stars } from "./Stars";
import { GenreBadge } from "./GenreBadge";
import { BookCover } from "./BookCover";

export function BookCard({
  book,
  onSelect,
  purchased,
}: {
  book: Book;
  onSelect: (b: Book) => void;
  purchased?: boolean;
}) {
  return (
    <article
      onClick={() => onSelect(book)}
      className="group bg-white rounded-xl border border-[rgba(49,92,76,0.08)] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden hover:-translate-y-0.5"
    >
      <div className="p-4 flex gap-3">
        <BookCover book={book} />
        <div className="flex-1 min-w-0">
          <div className="flex gap-1 justify-between">
            <h3
              className="font-semibold text-[#292824] leading-snug line-clamp-2 group-hover:text-[#315C4C] transition-colors text-sm"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {book.title}
            </h3>
            {purchased && (
              <span className="flex-shrink-0 bg-[#315C4C] text-white rounded-full w-5 h-5 flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3" />
              </span>
            )}
          </div>
          <p className="text-xs text-[#7A7264] mt-0.5">{book.author}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <Stars rating={book.rating} />
            <span className="text-xs text-[#7A7264]">
              {book.rating} ({book.reviews.toLocaleString("pt-BR")})
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-1 flex-wrap">
            <span className="text-[#315C4C] font-bold text-sm">
              {fmt(book.price)}
            </span>
            <GenreBadge genre={book.genre} />
          </div>
          {!book.available && (
            <p className="text-xs text-stone-400 mt-1">Em breve</p>
          )}
        </div>
      </div>
    </article>
  );
}
