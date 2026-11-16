import { genreCls } from "../lib/format";

export function GenreBadge({ genre }: { genre: string }) {
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${genreCls(genre)}`}
    >
      {genre}
    </span>
  );
}
