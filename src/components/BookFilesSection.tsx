import { useEffect, useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import {
  ApiError,
  deleteBookFile,
  fetchBookFiles,
  uploadBookFile,
  type BookFile,
  type BookFileFormat,
} from "../lib/api";

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Arquivos PDF/EPUB que os compradores leem. O envio é imediato,
// independente do botão "Salvar alterações" do formulário.
export function BookFilesSection({ bookId }: { bookId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<BookFile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() {
    return fetchBookFiles(bookId).then(setFiles);
  }

  useEffect(() => {
    load().catch(() => setError("Não foi possível carregar os arquivos."));
  }, [bookId]);

  async function run(action: () => Promise<void>) {
    setError("");
    setBusy(true);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void run(() => uploadBookFile(bookId, file));
  }

  function handleDelete(format: BookFileFormat) {
    void run(() => deleteBookFile(bookId, format));
  }

  return (
    <div className="bg-[#F7F3EA] rounded-xl p-4">
      {files === null && !error ? (
        <p className="text-sm text-[#7A7264]">Carregando arquivos...</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {files?.length === 0 && (
            <li className="text-sm text-[#7A7264]">
              Nenhum arquivo enviado. Sem arquivo, quem comprar não consegue ler.
            </li>
          )}
          {files?.map((f) => (
            <li key={f.format} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2">
              <FileText className="w-4 h-4 text-[#315C4C] flex-shrink-0" />
              <span className="text-xs font-semibold text-[#315C4C] w-10">{f.format}</span>
              <span className="text-sm text-[#292824] truncate flex-1" title={f.fileName}>
                {f.fileName}
              </span>
              <span className="text-xs text-[#7A7264] flex-shrink-0">{formatSize(f.sizeBytes)}</span>
              <button
                type="button"
                onClick={() => handleDelete(f.format)}
                disabled={busy}
                title={`Remover ${f.format}`}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.epub,application/pdf,application/epub+zip"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[rgba(49,92,76,0.2)] text-[#315C4C] text-xs font-semibold rounded-lg hover:bg-[rgba(49,92,76,0.05)] transition-colors disabled:opacity-60"
      >
        {busy ? (
          <div className="w-3.5 h-3.5 border-2 border-[#315C4C]/30 border-t-[#315C4C] rounded-full animate-spin" />
        ) : (
          <Upload className="w-3.5 h-3.5" />
        )}
        {busy ? "Enviando..." : "Enviar PDF ou EPUB"}
      </button>
      <p className="text-xs text-[#7A7264] mt-2">
        Até 50 MB. Enviar outro arquivo do mesmo formato substitui o atual.
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>
      )}
    </div>
  );
}
