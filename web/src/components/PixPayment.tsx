import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, QrCode, RefreshCw } from "lucide-react";
import type { Book } from "../types";
import {
  ApiError,
  fetchPurchase,
  simulatePixPayment,
  startPixPurchase,
  type PixPurchase,
} from "../lib/api";
import { fmt } from "../lib/format";

const POLL_MS = 3000;

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Pagamento com Pix: gera a cobrança, mostra o QR code e o "copia e cola" e
// fica consultando a API até o pagamento ser confirmado.
export function PixPayment({
  book,
  onPaid,
  onBusyChange,
}: {
  book: Book;
  onPaid: (book: Book) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [purchase, setPurchase] = useState<PixPurchase | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const paidRef = useRef(false);

  const pending = purchase?.status === "iniciada";
  const remaining = purchase?.expiresAt ? purchase.expiresAt.getTime() - now : 0;

  function handleUpdate(p: PixPurchase) {
    setPurchase(p);
    if (p.status === "confirmada" && !paidRef.current) {
      paidRef.current = true;
      onPaid(p.book);
    }
  }

  async function generate() {
    setError("");
    setLoading(true);
    onBusyChange(true);
    try {
      const p = await startPixPurchase(book.id);
      if (p.code) {
        setQr(await QRCode.toDataURL(p.code, { width: 220, margin: 1, color: { dark: "#1F3D33" } }));
      }
      setCopied(false);
      setNow(Date.now());
      handleUpdate(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível gerar o Pix.");
    } finally {
      setLoading(false);
      onBusyChange(false);
    }
  }

  // Enquanto espera: relógio a cada segundo e consulta à API a cada 3 s.
  // Quando o prazo acaba, uma última consulta faz a API marcar o Pix como expirado.
  useEffect(() => {
    if (!pending || !purchase) return;
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(() => {
      fetchPurchase(purchase.id).then(handleUpdate).catch(() => {});
    }, POLL_MS);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(poll);
    };
    // handleUpdate só usa setters e uma ref, por isso não entra nas dependências.
  }, [pending, purchase?.id]);

  useEffect(() => {
    if (pending && purchase && remaining <= 0) {
      fetchPurchase(purchase.id).then(handleUpdate).catch(() => {});
    }
  }, [pending, remaining <= 0]);

  async function copy() {
    if (!purchase?.code) return;
    try {
      await navigator.clipboard.writeText(purchase.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  }

  async function simulate() {
    if (!purchase) return;
    setError("");
    setSimulating(true);
    try {
      handleUpdate(await simulatePixPayment(purchase.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível simular o pagamento.");
    } finally {
      setSimulating(false);
    }
  }

  const testNotice = (
    <div className="text-xs text-[#7A7264] bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
      <strong className="text-amber-800">Pix de teste:</strong> o código usa uma chave que não
      existe, então nenhum app de banco consegue pagar e nada é cobrado. Use o botão{" "}
      <strong>Simular pagamento</strong> para fazer o papel do banco.
    </div>
  );

  if (!purchase || purchase.status !== "iniciada") {
    const expired = purchase?.status === "falha";
    return (
      <div className="space-y-3 mb-5">
        {testNotice}
        {expired && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {purchase.failureReason === "Pix expirado"
              ? "O prazo deste Pix acabou. Gere um novo código para pagar."
              : (purchase.failureReason ?? "Este Pix não pode mais ser pago.")}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="w-full py-2.5 bg-[#315C4C] text-white text-sm font-semibold rounded-xl hover:bg-[#1F3D33] transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-md"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : expired ? (
            <RefreshCw className="w-4 h-4" />
          ) : (
            <QrCode className="w-4 h-4" />
          )}
          {loading ? "Gerando Pix..." : expired ? "Gerar novo Pix" : `Gerar Pix de ${fmt(book.price)}`}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-5">
      <div className="text-center">
        {qr && (
          <img
            src={qr}
            alt="QR code do Pix"
            width={220}
            height={220}
            className="mx-auto rounded-lg border border-[rgba(49,92,76,0.12)]"
          />
        )}
        <p className="text-xs text-[#7A7264] mt-2">
          Escaneie no app do banco ou use o código abaixo
        </p>
        <p className="text-sm font-semibold text-[#292824] mt-1" aria-live="polite">
          Expira em {formatRemaining(remaining)}
        </p>
      </div>

      <div className="flex gap-2">
        <input
          readOnly
          value={purchase.code ?? ""}
          aria-label="Pix copia e cola"
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-[#F7F3EA] border border-[rgba(49,92,76,0.15)] rounded-lg text-[#292824]"
        />
        <button
          type="button"
          onClick={copy}
          className="px-3 py-2 text-xs font-semibold text-[#315C4C] bg-white border border-[rgba(49,92,76,0.2)] rounded-lg hover:bg-[rgba(49,92,76,0.05)] transition-colors flex items-center gap-1.5 flex-shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-[#7A7264]">
        <div className="w-3.5 h-3.5 border-2 border-[#315C4C]/20 border-t-[#315C4C] rounded-full animate-spin" />
        Aguardando pagamento...
      </div>

      {testNotice}

      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={simulate}
        disabled={simulating}
        className="w-full py-2.5 bg-[#C6A15B] text-[#1F3D33] text-sm font-bold rounded-xl hover:brightness-95 transition disabled:opacity-70"
      >
        {simulating ? "Confirmando..." : "Simular pagamento"}
      </button>
    </div>
  );
}
