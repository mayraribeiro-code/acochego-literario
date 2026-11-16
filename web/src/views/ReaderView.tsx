import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import ePub, { type Book as EpubBook, type Rendition } from "epubjs";
import type { Book } from "../types";
import {
  ApiError,
  fetchBookContent,
  fetchReadingFormats,
  fetchReadingProgress,
  saveReadingProgress,
  type BookFileFormat,
  type ReadingProgress,
} from "../lib/api";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// O que cada leitor (PDF ou EPUB) expõe para a barra de navegação.
interface ReaderControls {
  prev: () => void;
  next: () => void;
}

interface Progress {
  label: string;
  percent: number;
}

// Leitores avisam a posição atual por aqui (página/CFI e porcentagem).
type ReportPosition = (position: string, percent: number) => void;

const SAVE_DELAY_MS = 1500;

export function ReaderView({ book, onClose }: { book: Book; onClose: () => void }) {
  const [formats, setFormats] = useState<BookFileFormat[] | null>(null);
  const [format, setFormat] = useState<BookFileFormat | null>(null);
  const [error, setError] = useState("");

  // Último progresso conhecido de cada formato (vindo da API ou da leitura atual).
  const savedRef = useRef<Partial<Record<BookFileFormat, ReadingProgress>>>({});
  const pendingRef = useRef<ReadingProgress | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    Promise.all([
      fetchReadingFormats(book.id),
      // Sem progresso salvo (ou falha ao buscar), o livro abre do começo.
      fetchReadingProgress(book.id).catch(() => [] as ReadingProgress[]),
    ])
      .then(([f, progress]) => {
        for (const p of progress) savedRef.current[p.format] ??= p;
        setFormats(f);
        // Abre no formato lido por último; sem histórico, prefere EPUB,
        // que se ajusta à tela (o PDF mantém o layout da página).
        const lastRead = progress.find((p) => f.includes(p.format))?.format;
        setFormat(lastRead ?? (f.includes("EPUB") ? "EPUB" : f[0] ?? null));
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Não foi possível abrir o livro."),
      );
  }, [book.id]);

  // Envia o progresso pendente. Falhar ao salvar não deve atrapalhar a leitura.
  function flush(keepalive = false) {
    window.clearTimeout(timerRef.current);
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    saveReadingProgress(book.id, pending, keepalive).catch(() => {});
  }
  const flushRef = useRef(flush);
  flushRef.current = flush;

  // Salva ao fechar o leitor e também se a aba for fechada no meio da leitura.
  useEffect(() => {
    const onHide = () => flushRef.current(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      flushRef.current(true);
    };
  }, []);

  function reportFor(f: BookFileFormat): ReportPosition {
    return (position, percent) => {
      const progress = { format: f, position, percent };
      savedRef.current[f] = progress;
      pendingRef.current = progress;
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => flushRef.current(), SAVE_DELAY_MS);
    };
  }

  function switchFormat(f: BookFileFormat) {
    flush();
    setFormat(f);
  }

  // Esc fecha o leitor; a página de trás não rola enquanto ele está aberto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const unavailable = formats !== null && formats.length === 0;

  return (
    <div
      className="fixed inset-0 z-40 bg-[#F7F3EA] flex flex-col"
      style={{ fontFamily: "'Lato', sans-serif" }}
      role="dialog"
      aria-label={`Lendo ${book.title}`}
    >
      {/* Barra superior: voltar, título e formato */}
      <header className="flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-[rgba(49,92,76,0.12)] bg-[#F7F3EA]/95">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-[#315C4C] hover:text-[#1F3D33] transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Minha Biblioteca</span>
        </button>
        <div className="flex-1 min-w-0 text-center">
          <p
            className="font-semibold text-[#1F3D33] text-sm truncate"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {book.title}
          </p>
          <p className="text-xs text-[#7A7264] truncate">{book.author}</p>
        </div>
        <div className="flex-shrink-0 w-24 flex justify-end">
          {formats && formats.length > 1 && (
            <div className="flex bg-[#EAE5D8] rounded-lg p-0.5" role="group" aria-label="Formato">
              {formats.map((f) => (
                <button
                  key={f}
                  onClick={() => switchFormat(f)}
                  aria-pressed={format === f}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                    format === f ? "bg-white text-[#1F3D33] shadow-sm" : "text-[#7A7264] hover:text-[#292824]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {error || unavailable ? (
        <ReaderMessage
          title={unavailable ? "Arquivo ainda não disponível" : "Não foi possível abrir o livro"}
          text={unavailable ? "O arquivo digital deste livro ainda não foi publicado. Tente novamente mais tarde." : error}
          onClose={onClose}
        />
      ) : format === "PDF" ? (
        <PdfReader
          key="pdf"
          bookId={book.id}
          initial={savedRef.current.PDF}
          onPosition={reportFor("PDF")}
        />
      ) : format === "EPUB" ? (
        <EpubReader
          key="epub"
          bookId={book.id}
          initial={savedRef.current.EPUB}
          onPosition={reportFor("EPUB")}
        />
      ) : (
        <div className="flex-1 relative">
          <ReaderLoading />
        </div>
      )}
    </div>
  );
}

// ── PDF ───────────────────────────────────────────────────────────────────────

function PdfReader({
  bookId,
  initial,
  onPosition,
}: {
  bookId: string;
  initial?: ReadingProgress;
  onPosition: ReportPosition;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState("");
  const initialRef = useRef(initial);
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  useEffect(() => {
    let loaded: pdfjs.PDFDocumentProxy | null = null;
    let cancelled = false;
    fetchBookContent(bookId, "PDF")
      .then((data) => pdfjs.getDocument({ data }).promise)
      .then((d) => {
        loaded = d;
        if (cancelled) {
          void d.destroy();
          return;
        }
        // Volta para a página salva (se o PDF mudou de tamanho, fica no limite).
        const saved = Number.parseInt(initialRef.current?.position ?? "", 10);
        setPage(Number.isFinite(saved) ? Math.min(Math.max(saved, 1), d.numPages) : 1);
        setDoc(d);
      })
      .catch((err) =>
        !cancelled && setError(err instanceof ApiError ? err.message : "Não foi possível abrir o PDF."),
      );
    return () => {
      cancelled = true;
      void loaded?.destroy();
    };
  }, [bookId]);

  // A página ocupa a largura disponível (até 820px) e se ajusta ao redimensionar.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !width || !canvasRef.current) return;
    let task: pdfjs.RenderTask | null = null;
    let cancelled = false;
    void doc.getPage(page).then((p) => {
      if (cancelled || !canvasRef.current) return;
      const cssWidth = Math.min(width, 820);
      const viewport = p.getViewport({ scale: cssWidth / p.getViewport({ scale: 1 }).width });
      const ratio = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      task = p.render({
        canvas,
        viewport,
        transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
      });
      task.promise.catch(() => {
        // Renderização cancelada ao trocar de página: nada a fazer.
      });
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page, width]);

  const total = doc?.numPages ?? 0;
  const controls: ReaderControls = {
    prev: () => setPage((p) => Math.max(1, p - 1)),
    next: () => setPage((p) => Math.min(total, p + 1)),
  };
  useArrowKeys(controls);

  // Volta ao topo ao trocar de página.
  // (Chaves necessárias: no Chrome atual scrollTo devolve uma Promise, e o
  // React trataria esse retorno como função de limpeza.)
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 });
  }, [page]);

  useEffect(() => {
    if (doc) onPositionRef.current(String(page), (page / doc.numPages) * 100);
  }, [doc, page]);

  if (error) return <ReaderMessage title="Não foi possível abrir o livro" text={error} />;

  return (
    <>
      <div ref={containerRef} className="flex-1 relative overflow-auto px-4 py-6">
        {!doc && <ReaderLoading />}
        <canvas
          ref={canvasRef}
          className={`mx-auto bg-white shadow-md rounded-sm ${doc ? "block" : "hidden"}`}
          aria-label={`Página ${page} de ${total}`}
        />
      </div>
      <ReaderFooter
        controls={controls}
        canPrev={page > 1}
        canNext={page < total}
        progress={doc ? { label: `Página ${page} de ${total}`, percent: (page / total) * 100 } : null}
      />
    </>
  );
}

// ── EPUB ──────────────────────────────────────────────────────────────────────

function EpubReader({
  bookId,
  initial,
  onPosition,
}: {
  bookId: string;
  initial?: ReadingProgress;
  onPosition: ReportPosition;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [error, setError] = useState("");
  const initialRef = useRef(initial);
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  useEffect(() => {
    let epub: EpubBook | null = null;
    let cancelled = false;
    // A porcentagem exata só existe depois de gerar as "locations" do livro;
    // até lá, mantém a última conhecida.
    let percent = initialRef.current?.percent ?? 0;

    function report(cfi: string) {
      if (epub && epub.locations.length() > 0) {
        percent = Math.round(epub.locations.percentageFromCfi(cfi) * 100);
      }
      setProgress({ label: `${percent}% lido`, percent });
      onPositionRef.current(cfi, percent);
    }

    fetchBookContent(bookId, "EPUB")
      .then(async (data) => {
        if (cancelled || !viewerRef.current) return;
        epub = ePub(data);
        const rendition = epub.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "none",
        });
        rendition.themes.default({
          body: {
            "font-family": "Georgia, 'Times New Roman', serif !important",
            color: "#292824 !important",
            "line-height": "1.7 !important",
            padding: "0 8px !important",
          },
          h1: { color: "#1F3D33 !important" },
        });
        rendition.themes.fontSize("110%");
        renditionRef.current = rendition;

        rendition.on("relocated", (location: { start: { cfi: string }; atStart: boolean; atEnd: boolean }) => {
          setAtStart(location.atStart);
          setAtEnd(location.atEnd);
          report(location.start.cfi);
        });

        // Volta para a posição salva; se ela não existir mais (arquivo trocado), abre no início.
        const saved = initialRef.current?.position;
        try {
          await rendition.display(saved);
        } catch {
          await rendition.display();
        }
        if (cancelled) return;
        setReady(true);
        await epub.locations.generate(1024);
        const current = rendition.currentLocation() as unknown as { start?: { cfi: string } };
        if (!cancelled && current?.start) report(current.start.cfi);
      })
      .catch((err) =>
        !cancelled && setError(err instanceof ApiError ? err.message : "Não foi possível abrir o EPUB."),
      );

    return () => {
      cancelled = true;
      renditionRef.current = null;
      epub?.destroy();
    };
  }, [bookId]);

  const controls: ReaderControls = {
    prev: () => void renditionRef.current?.prev(),
    next: () => void renditionRef.current?.next(),
  };
  useArrowKeys(controls);

  if (error) return <ReaderMessage title="Não foi possível abrir o livro" text={error} />;

  return (
    <>
      <div className="flex-1 relative overflow-hidden">
        {!ready && <ReaderLoading />}
        <div ref={viewerRef} className="absolute inset-0 mx-auto max-w-2xl px-4 py-6" />
      </div>
      <ReaderFooter controls={controls} canPrev={ready && !atStart} canNext={ready && !atEnd} progress={progress} />
    </>
  );
}

// ── Partes comuns ─────────────────────────────────────────────────────────────

function useArrowKeys(controls: ReaderControls) {
  const ref = useRef(controls);
  ref.current = controls;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") ref.current.prev();
      if (e.key === "ArrowRight") ref.current.next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function ReaderFooter({
  controls,
  canPrev,
  canNext,
  progress,
}: {
  controls: ReaderControls;
  canPrev: boolean;
  canNext: boolean;
  progress: Progress | null;
}) {
  const navCls =
    "flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#315C4C] rounded-lg hover:bg-[rgba(49,92,76,0.08)] transition-colors disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <footer className="flex items-center gap-3 px-4 sm:px-6 h-16 border-t border-[rgba(49,92,76,0.12)]">
      <button onClick={controls.prev} disabled={!canPrev} className={navCls} aria-label="Página anterior">
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Anterior</span>
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1 bg-[#EAE5D8] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#315C4C] transition-all duration-300"
            style={{ width: `${progress?.percent ?? 0}%` }}
          />
        </div>
        <p className="text-xs text-[#7A7264] text-center mt-1.5" aria-live="polite">
          {progress?.label ?? " "}
        </p>
      </div>
      <button onClick={controls.next} disabled={!canNext} className={navCls} aria-label="Próxima página">
        <span className="hidden sm:inline">Próxima</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </footer>
  );
}

function ReaderLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#315C4C]/20 border-t-[#315C4C] rounded-full animate-spin" />
    </div>
  );
}

function ReaderMessage({
  title,
  text,
  onClose,
}: {
  title: string;
  text: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <h2 className="text-lg font-semibold text-[#292824]">{title}</h2>
      <p className="text-sm text-[#7A7264] mt-1 max-w-sm">{text}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 text-sm text-[#315C4C] border border-[rgba(49,92,76,0.2)] rounded-lg hover:bg-[rgba(49,92,76,0.05)] transition-colors"
        >
          Voltar à biblioteca
        </button>
      )}
    </div>
  );
}
