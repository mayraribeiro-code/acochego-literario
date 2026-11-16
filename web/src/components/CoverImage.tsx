import { useState } from "react";
import type { Book } from "../types";

// Imagem de capa por cima da capa desenhada com as cores do livro. Se o livro
// não tem imagem, ou ela falhar ao carregar, fica só a capa desenhada.
export function CoverImage({ book }: { book: Book }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!book.coverUrl || failed === book.coverUrl) return null;
  return (
    <img
      src={book.coverUrl}
      alt={`Capa de ${book.title}`}
      loading="lazy"
      onError={() => setFailed(book.coverUrl)}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}
