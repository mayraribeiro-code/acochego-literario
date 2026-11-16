import { useState } from "react";
import { Download } from "lucide-react";
import type { Book } from "../types";
import {
  ApiError,
  downloadBook,
  fetchReadingFormats,
  type BookFileFormat,
} from "../lib/api";

// Botão "Baixar" dos livros comprados. Consulta quais arquivos existem:
// com um só formato baixa direto; com PDF e EPUB, mostra a escolha.
export function DownloadButton({
  book,
  size,
  onMessage,
}: {
  book: Book;
  size: "md" | "sm";
  onMessage: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<BookFileFormat[] | null>(null);

  const cls =
    size === "md"
      ? "py-2.5 border-[rgba(49,92,76,0.2)] text-sm rounded-lg gap-2"
      : "py-2 border-[rgba(49,92,76,0.15)] text-xs rounded-lg gap-1.5";
  const base = `bg-white border text-[#315C4C] font-semibold hover:bg-[rgba(49,92,76,0.05)] transition-colors flex items-center justify-center disabled:opacity-60 ${cls}`;
  const icon = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      onMessage(err instanceof ApiError ? err.message : "Não foi possível baixar o livro.");
    } finally {
      setBusy(false);
    }
  }

  function download(format: BookFileFormat) {
    setChoices(null);
    void run(() => downloadBook(book.id, format, book.title));
  }

  function handleClick() {
    void run(async () => {
      const formats = await fetchReadingFormats(book.id);
      if (formats.length === 0) {
        onMessage("O arquivo deste livro ainda não está disponível.");
      } else if (formats.length === 1) {
        await downloadBook(book.id, formats[0], book.title);
      } else {
        setChoices(formats);
      }
    });
  }

  if (choices) {
    return (
      <div className="flex-1 w-full flex gap-1.5" role="group" aria-label="Escolha o formato para baixar">
        {choices.map((f) => (
          <button key={f} onClick={() => download(f)} className={`flex-1 ${base}`}>
            <Download className={icon} /> {f}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button onClick={handleClick} disabled={busy} className={`flex-1 w-full ${base}`}>
      {busy ? (
        <div className={`${icon} border-2 border-[#315C4C]/30 border-t-[#315C4C] rounded-full animate-spin`} />
      ) : (
        <Download className={icon} />
      )}
      {busy ? "Baixando..." : "Baixar"}
    </button>
  );
}
