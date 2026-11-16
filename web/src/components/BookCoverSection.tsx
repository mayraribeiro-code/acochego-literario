import { useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import type { Book } from "../types";
import { ApiError, removeBookCover, uploadBookCover } from "../lib/api";

const MAX_BYTES = 2 * 1024 * 1024;

// Imagem de capa do livro. Como os arquivos digitais, o envio é imediato,
// independente do botão "Salvar alterações" do formulário.
export function BookCoverSection({
  book,
  onChange,
}: {
  book: Book;
  onChange: (book: Book) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<Book>) {
    setError("");
    setBusy(true);
    try {
      onChange(await action());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível atualizar a capa.");
    } finally {
      setBusy(false);
    }
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("A imagem precisa ter no máximo 2 MB.");
      return;
    }
    void run(() => uploadBookCover(book.id, file));
  }

  const btn =
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-60";

  return (
    <div className="mt-3">
      <p className="text-xs text-[#7A7264] mb-2">
        {book.coverUrl
          ? "Esta imagem aparece no lugar da capa desenhada com as cores."
          : "Opcional: envie uma imagem (JPG, PNG ou WebP, até 2 MB). Sem imagem, a capa é desenhada com as cores acima."}
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={`${btn} bg-white border border-[rgba(49,92,76,0.2)] text-[#315C4C] hover:bg-[rgba(49,92,76,0.05)]`}
        >
          <ImageUp className="w-3.5 h-3.5" />
          {busy ? "Enviando…" : book.coverUrl ? "Trocar imagem" : "Enviar imagem de capa"}
        </button>
        {book.coverUrl && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => removeBookCover(book.id))}
            className={`${btn} text-red-700 hover:bg-red-50`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remover imagem
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="text-xs text-red-600 mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
