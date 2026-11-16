import type { Book } from "../types";

export function BookCover({
  book,
  w = "w-24",
  h = "h-36",
}: {
  book: Book;
  w?: string;
  h?: string;
}) {
  return (
    <div
      className={`${w} ${h} relative rounded-lg overflow-hidden flex-shrink-0 shadow-md`}
      style={{
        background: `linear-gradient(160deg, ${book.coverFrom}, ${book.coverTo})`,
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ background: book.coverText, opacity: 0.45 }}
      />
      <div className="absolute inset-0 p-2.5 flex flex-col justify-between">
        <p
          className="font-bold leading-snug"
          style={{
            color: book.coverText,
            fontFamily: "'Playfair Display', serif",
            fontSize: "0.6rem",
          }}
        >
          {book.title}
        </p>
        <div>
          <div
            className="h-px mb-1"
            style={{ background: book.coverText, opacity: 0.4 }}
          />
          <p
            className="truncate"
            style={{ color: book.coverText, opacity: 0.8, fontSize: "0.55rem" }}
          >
            {book.author}
          </p>
        </div>
      </div>
    </div>
  );
}
