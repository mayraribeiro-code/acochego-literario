import { useEffect, useState } from "react";
import { BookMarked, Shield, BarChart3, Plus, Trash2, Edit3, Package, Users } from "lucide-react";
import type { AdminPurchase, AdminSummary, Book } from "../types";
import { fmt } from "../lib/format";
import {
  ApiError,
  fetchAdminBooks,
  fetchAdminPurchases,
  fetchAdminSummary,
  setBookActive,
} from "../lib/api";
import { GenreBadge } from "../components/GenreBadge";
import { BookCover } from "../components/BookCover";
import { BookFormModal } from "../components/BookFormModal";

export function AdminView({
  onCatalogChange,
  onMessage,
}: {
  onCatalogChange: () => void;
  onMessage: (message: string) => void;
}) {
  const [tab, setTab] = useState<"books" | "purchases">("books");
  const [books, setBooks] = useState<Book[]>([]);
  // undefined = formulário fechado; null = novo livro; Book = editando
  const [editing, setEditing] = useState<Book | null | undefined>(undefined);

  // Sugestões do formulário, a partir dos livros já cadastrados.
  const authors = [...new Set(books.map((b) => b.author))].sort();
  const genres = [...new Set(books.map((b) => b.genre))].sort();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [purchases, setPurchases] = useState<AdminPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  function loadSummary() {
    return fetchAdminSummary().then(setSummary);
  }

  useEffect(() => {
    Promise.all([
      fetchAdminBooks().then(setBooks),
      fetchAdminPurchases().then(setPurchases),
      loadSummary(),
    ])
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Não foi possível carregar o painel."),
      )
      .finally(() => setLoading(false));
  }, []);

  async function onToggle(id: string) {
    const book = books.find((b) => b.id === id);
    if (!book) return;
    try {
      const updated = await setBookActive(id, !book.active);
      setBooks((prev) => prev.map((b) => (b.id === id ? updated : b)));
      onCatalogChange();
      void loadSummary();
    } catch (err) {
      onMessage(err instanceof ApiError ? err.message : "Não foi possível atualizar o livro.");
    }
  }

  function handleSaved(saved: Book, created: boolean) {
    setBooks((prev) =>
      created ? [...prev, saved] : prev.map((b) => (b.id === saved.id ? saved : b)),
    );
    setEditing(undefined);
    onCatalogChange();
    void loadSummary();
    onMessage(created ? `"${saved.title}" cadastrado no catálogo.` : `"${saved.title}" atualizado.`);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-[#315C4C] rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1
            className="text-2xl font-bold text-[#1F3D33]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Painel Administrativo
          </h1>
          <p className="text-xs text-[#7A7264]">
            Gerenciamento do Aconchego Literário
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Livros ativos",
            value: summary?.activeBooks ?? "—",
            Icon: BookMarked,
            cls: "text-[#315C4C] bg-emerald-50",
          },
          {
            label: "Compras",
            value: summary?.purchases ?? "—",
            Icon: Package,
            cls: "text-amber-700 bg-amber-50",
          },
          {
            label: "Clientes",
            value: summary?.clients ?? "—",
            Icon: Users,
            cls: "text-blue-700 bg-blue-50",
          },
          {
            label: "Receita",
            value: summary ? fmt(summary.revenue) : "—",
            Icon: BarChart3,
            cls: "text-purple-700 bg-purple-50",
          },
        ].map(({ label, value, Icon, cls }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-[rgba(49,92,76,0.08)] p-4 shadow-sm"
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${cls.split(" ")[1]}`}
            >
              <Icon className={`w-5 h-5 ${cls.split(" ")[0]}`} />
            </div>
            <p className="text-2xl font-bold text-[#292824]">{value}</p>
            <p className="text-xs text-[#7A7264] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {loadError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-5">
          {loadError}
        </p>
      )}

      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-[#315C4C]/20 border-t-[#315C4C] rounded-full animate-spin" />
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-1 mb-5 bg-[#EAE5D8] rounded-xl p-1 w-fit">
        {(["books", "purchases"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-[#1F3D33] shadow-sm"
                : "text-[#7A7264] hover:text-[#292824]"
            }`}
          >
            {t === "books" ? "Livros" : "Compras"}
          </button>
        ))}
      </div>

      {tab === "books" ? (
        <div className="bg-white rounded-xl border border-[rgba(49,92,76,0.08)] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(49,92,76,0.08)] flex items-center justify-between">
            <h2 className="font-semibold text-[#292824]">Gerenciar Livros</h2>
            <button
              onClick={() => setEditing(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#315C4C] text-white text-xs font-semibold rounded-lg hover:bg-[#1F3D33] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Novo livro
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(49,92,76,0.06)]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#7A7264] uppercase tracking-wide">
                    Livro
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[#7A7264] uppercase tracking-wide hidden md:table-cell">
                    Gênero
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[#7A7264] uppercase tracking-wide hidden md:table-cell">
                    Preço
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-[#7A7264] uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr
                    key={book.id}
                    className="border-b border-[rgba(49,92,76,0.04)] hover:bg-[rgba(49,92,76,0.02)] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <BookCover book={book} w="w-8" h="h-12" />
                        <div>
                          <p className="font-medium text-[#292824] text-xs line-clamp-1">
                            {book.title}
                          </p>
                          <p className="text-xs text-[#7A7264]">{book.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <GenreBadge genre={book.genre} />
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell text-sm font-medium text-[#315C4C]">
                      {fmt(book.price)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          book.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {book.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditing(book)}
                          title="Editar"
                          className="p-1.5 text-[#7A7264] hover:text-[#315C4C] hover:bg-[rgba(49,92,76,0.08)] rounded transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onToggle(book.id)}
                          className={`p-1.5 rounded transition-colors ${
                            book.active
                              ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                              : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                          }`}
                          title={book.active ? "Desativar" : "Ativar"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[rgba(49,92,76,0.08)] shadow-sm p-5">
          <h2 className="font-semibold text-[#292824] mb-4">
            Compras recentes
          </h2>
          {!loading && purchases.length === 0 && (
            <p className="text-sm text-[#7A7264]">Nenhuma compra registrada ainda.</p>
          )}
          <div className="space-y-3">
            {purchases.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between py-2 border-b border-[rgba(49,92,76,0.06)] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#F7F3EA] rounded-full flex items-center justify-center text-xs font-bold text-[#315C4C] flex-shrink-0">
                    {row.client[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#292824]">
                      {row.client}
                    </p>
                    <p className="text-xs text-[#7A7264]">
                      {row.book} · {row.date}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#315C4C]">{fmt(row.value)}</p>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full capitalize">
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing !== undefined && (
        <BookFormModal
          book={editing}
          authors={authors}
          genres={genres}
          onClose={() => setEditing(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
