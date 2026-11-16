import { useState } from "react";
import { X, Check, CreditCard, Lock, QrCode } from "lucide-react";
import type { Book } from "../types";
import { fmt } from "../lib/format";
import { ApiError, buyBook, type CardInput } from "../lib/api";
import { BookCover } from "./BookCover";
import { PixPayment } from "./PixPayment";

// "4242424242424242" -> "4242 4242 4242 4242"
function groupDigits(digits: string) {
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

// Lê "MM/AA" e devolve mês e ano completo, ou null se for inválido.
function parseExpiry(value: string): { month: number; year: number } | null {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return null;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return null;
  return { month, year: 2000 + Number(m[2]) };
}

function isExpired({ month, year }: { month: number; year: number }) {
  // Vale até o último dia do mês de validade.
  return new Date(year, month, 1).getTime() <= Date.now();
}

const inputCls =
  "w-full px-3 py-2 text-sm bg-white border border-[rgba(49,92,76,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#315C4C]/20 focus:border-[#315C4C]";

export function PurchaseModal({
  book,
  onClose,
  onConfirm,
}: {
  book: Book;
  onClose: () => void;
  onConfirm: (book: Book) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [method, setMethod] = useState<"card" | "pix">("card");
  // Enquanto o Pix está sendo gerado, o modal não fecha nem troca de aba.
  const [pixBusy, setPixBusy] = useState(false);

  function handlePixPaid(purchased: Book) {
    setDone(true);
    setTimeout(() => onConfirm(purchased), 1800);
  }

  const free = book.price === 0;

  // Confere o formato antes de enviar; quem decide se aprova é o pagamento.
  function readCard(): CardInput | string {
    if (number.length < 13) return "Informe o número do cartão.";
    if (!holder.trim()) return "Informe o nome impresso no cartão.";
    const exp = parseExpiry(expiry);
    if (!exp) return "Informe a validade no formato MM/AA.";
    if (isExpired(exp)) return "Este cartão está vencido.";
    if (cvv.length < 3) return "Informe o código de segurança (CVV).";
    return { number, holder: holder.trim(), cvv, ...exp };
  }

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    // No Pix quem paga é o painel do Pix; Enter no formulário não faz nada.
    if (!free && method === "pix") return;
    setError("");
    let card: CardInput | undefined;
    if (!free) {
      const read = readCard();
      if (typeof read === "string") {
        setError(read);
        return;
      }
      card = read;
    }
    setLoading(true);
    try {
      const purchased = await buyBook(book.id, card);
      setDone(true);
      setTimeout(() => onConfirm(purchased), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={!loading && !done && !pixBusy ? onClose : undefined}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[calc(100vh-2rem)] overflow-y-auto p-6">
        {!done && (
          <button
            onClick={onClose}
            disabled={loading || pixBusy}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {done ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-[#315C4C] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3
              className="text-lg font-bold text-[#1F3D33]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {free ? "Livro adicionado!" : "Pagamento aprovado!"}
            </h3>
            <p className="text-sm text-[#7A7264] mt-1">
              "{book.title}" foi adicionado à sua biblioteca.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePurchase} noValidate>
            <h3
              className="text-lg font-bold text-[#1F3D33] mb-1 pr-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {free ? "Adicionar à biblioteca" : "Pagamento"}
            </h3>
            <p className="text-sm text-[#7A7264] mb-5">
              {free
                ? "Este livro é gratuito."
                : method === "pix"
                  ? "Pague com o QR code ou o código copia e cola."
                  : "Revise o livro e informe o cartão."}
            </p>

            <div className="flex gap-4 bg-[#F7F3EA] rounded-xl p-4 mb-5">
              <BookCover book={book} w="w-16" h="h-24" />
              <div className="min-w-0">
                <p
                  className="font-semibold text-[#292824] text-sm leading-snug line-clamp-2"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {book.title}
                </p>
                <p className="text-xs text-[#7A7264] mt-0.5">{book.author}</p>
                <p className="text-xs text-[#7A7264] mt-1">{book.format}</p>
                <p className="text-[#315C4C] font-bold mt-2 text-base">
                  {free ? "Grátis" : fmt(book.price)}
                </p>
              </div>
            </div>

            {!free && (
              <div
                role="tablist"
                aria-label="Forma de pagamento"
                className="grid grid-cols-2 gap-1 bg-[#EAE5D8] p-1 rounded-xl mb-4"
              >
                {(
                  [
                    ["card", "Cartão", CreditCard],
                    ["pix", "Pix", QrCode],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={method === value}
                    disabled={loading || pixBusy}
                    onClick={() => {
                      setMethod(value);
                      setError("");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-colors ${
                      method === value
                        ? "bg-white text-[#1F3D33] shadow-sm"
                        : "text-[#7A7264] hover:text-[#292824]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {!free && method === "pix" && (
              <PixPayment book={book} onPaid={handlePixPaid} onBusyChange={setPixBusy} />
            )}

            {!free && method === "card" && (
              <div className="space-y-3 mb-5">
                <div className="text-xs text-[#7A7264] bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                  <strong className="text-amber-800">Pagamento de teste:</strong> nenhum valor é
                  cobrado. Use <span className="font-mono">4242 4242 4242 4242</span> para aprovar
                  ou <span className="font-mono">4000 0000 0000 0002</span> para simular recusa.
                </div>
                <label className="block">
                  <span className="text-xs font-medium text-[#292824]">Número do cartão</span>
                  <div className="relative mt-1">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      value={groupDigits(number)}
                      onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 19))}
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="0000 0000 0000 0000"
                      className={`${inputCls} pl-9 font-mono`}
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-[#292824]">Nome no cartão</span>
                  <input
                    value={holder}
                    onChange={(e) => setHolder(e.target.value.slice(0, 100))}
                    autoComplete="cc-name"
                    placeholder="Como está impresso"
                    className={`${inputCls} mt-1`}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-[#292824]">Validade</span>
                    <input
                      value={expiry}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                      }}
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/AA"
                      className={`${inputCls} mt-1 font-mono`}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-[#292824]">CVV</span>
                    <input
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      className={`${inputCls} mt-1 font-mono`}
                    />
                  </label>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">
                {error}
              </p>
            )}

            {(free || method === "card") && (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#315C4C] text-white text-sm font-semibold rounded-xl hover:bg-[#1F3D33] transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                !free && <Lock className="w-4 h-4" />
              )}
              {loading
                ? "Processando pagamento..."
                : free
                  ? "Adicionar à biblioteca"
                  : `Pagar ${fmt(book.price)}`}
            </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={loading || pixBusy}
              className="w-full mt-2 py-2 text-sm text-[#7A7264] hover:text-[#292824] transition-colors"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
