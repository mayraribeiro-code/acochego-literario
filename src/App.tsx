import { Suspense, lazy, useEffect, useState } from "react";
import type { AppUser, AuthMode, Book, View } from "./types";
import {
  fetchBooks,
  fetchGenres,
  fetchLibrary,
  fetchMe,
  getToken,
  signOut,
} from "./lib/api";
import { Header } from "./components/Header";
import { AuthModal } from "./components/AuthModal";
import { PurchaseModal } from "./components/PurchaseModal";
import { Toast } from "./components/Toast";
import { HomeView } from "./views/HomeView";
import { CatalogView } from "./views/CatalogView";
import { BookDetailView } from "./views/BookDetailView";
import { LibraryView } from "./views/LibraryView";
import { AdminView } from "./views/AdminView";

// O leitor (pdf.js e epub.js) só é baixado quando alguém abre um livro.
const ReaderView = lazy(() =>
  import("./views/ReaderView").then((m) => ({ default: m.ReaderView })),
);

type LoadStatus = "loading" | "error" | "ready";

export default function App() {
  const [view, setView] = useState<View>("home");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [prevView, setPrevView] = useState<View>("home");

  const [books, setBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<LoadStatus>("loading");

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const purchasedIds = new Set(myBooks.map((b) => b.id));

  const [authModal, setAuthModal] = useState<{
    open: boolean;
    mode: AuthMode;
  }>({ open: false, mode: "login" });
  const [pendingBook, setPendingBook] = useState<Book | null>(null);

  const [purchaseModal, setPurchaseModal] = useState<{
    open: boolean;
    book: Book | null;
  }>({ open: false, book: null });

  const [readingBook, setReadingBook] = useState<Book | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function loadCatalog() {
    setCatalogStatus("loading");
    Promise.all([fetchBooks(), fetchGenres()])
      .then(([b, g]) => {
        setBooks(b);
        setGenres(g);
        setCatalogStatus("ready");
      })
      .catch(() => setCatalogStatus("error"));
  }

  useEffect(() => {
    loadCatalog();

    // Restaura a sessão salva (token JWT) ao abrir o site.
    const token = getToken();
    if (!token) return;
    fetchMe(token)
      .then(startSession)
      .catch(() => signOut());
  }, []);

  // Retorna os livros do usuário para quem precisa decidir algo logo após o login.
  async function startSession(user: AppUser) {
    setCurrentUser(user);
    if (user.role !== "client") return [];
    try {
      const library = await fetchLibrary();
      setMyBooks(library);
      return library;
    } catch {
      setToast("Não foi possível carregar sua biblioteca.");
      return [];
    }
  }

  function navigate(v: View) {
    if (v !== "bookDetail") setSelectedBook(null);
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectBook(book: Book) {
    setPrevView(view === "bookDetail" ? prevView : view);
    setSelectedBook(book);
    setView("bookDetail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openAuth(mode: AuthMode) {
    // Se o visitante estava vendo um livro, retoma a compra depois do login.
    if (view === "bookDetail" && selectedBook?.available) {
      setPendingBook(selectedBook);
    }
    setAuthModal({ open: true, mode });
  }

  async function handleAuthSuccess(user: AppUser) {
    setAuthModal({ open: false, mode: "login" });
    setToast(`Bem-vindo, ${user.name.split(" ")[0]}!`);
    const book = pendingBook;
    setPendingBook(null);
    const library = await startSession(user);
    const alreadyOwned = book && library.some((b) => b.id === book.id);
    if (book && !alreadyOwned && user.role === "client") {
      setPurchaseModal({ open: true, book });
    }
  }

  function handleLogout() {
    signOut();
    setReadingBook(null);
    setCurrentUser(null);
    setMyBooks([]);
    navigate("home");
    setToast("Sessão encerrada com sucesso.");
  }

  function handleBuy(book: Book) {
    if (!currentUser) {
      setPendingBook(book);
      openAuth("login");
      return;
    }
    setPurchaseModal({ open: true, book });
  }

  function handlePurchaseConfirm(book: Book) {
    setMyBooks((prev) => [book, ...prev.filter((b) => b.id !== book.id)]);
    setPurchaseModal({ open: false, book: null });
    setToast(`"${book.title}" adicionado à sua biblioteca!`);
  }

  const catalogReady = catalogStatus === "ready";

  return (
    <div
      className="min-h-screen bg-[#F7F3EA]"
      style={{ fontFamily: "'Lato', sans-serif" }}
    >
      <Header
        view={view}
        currentUser={currentUser}
        onNavigate={navigate}
        onOpenAuth={openAuth}
        onLogout={handleLogout}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
      />

      <main>
        {(view === "home" || view === "catalog") && !catalogReady && (
          <CatalogStatus status={catalogStatus} onRetry={loadCatalog} />
        )}

        {view === "home" && catalogReady && (
          <HomeView
            books={books}
            genres={genres}
            onNavigate={navigate}
            onSelectBook={selectBook}
          />
        )}

        {view === "catalog" && catalogReady && (
          <CatalogView
            books={books}
            genres={genres}
            onSelectBook={selectBook}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            purchasedIds={purchasedIds}
          />
        )}

        {view === "bookDetail" && selectedBook && (
          <BookDetailView
            book={selectedBook}
            currentUser={currentUser}
            purchased={purchasedIds.has(selectedBook.id)}
            onBack={() => navigate(prevView)}
            onBuy={handleBuy}
            onOpenAuth={openAuth}
            onRead={() => setReadingBook(selectedBook)}
            onDownload={() => setToast("Download em breve disponível.")}
          />
        )}

        {view === "library" && currentUser && (
          <LibraryView myBooks={myBooks} onRead={setReadingBook} />
        )}

        {view === "admin" && currentUser?.role === "admin" && (
          <AdminView onCatalogChange={loadCatalog} onMessage={setToast} />
        )}
      </main>

      {authModal.open && (
        <AuthModal
          mode={authModal.mode}
          onClose={() => {
            setAuthModal({ open: false, mode: "login" });
            setPendingBook(null);
          }}
          onSuccess={handleAuthSuccess}
          onSwitchMode={(m) => setAuthModal({ open: true, mode: m })}
        />
      )}

      {purchaseModal.open && purchaseModal.book && (
        <PurchaseModal
          book={purchaseModal.book}
          onClose={() => setPurchaseModal({ open: false, book: null })}
          onConfirm={handlePurchaseConfirm}
        />
      )}

      {readingBook && currentUser && (
        <Suspense fallback={null}>
          <ReaderView book={readingBook} onClose={() => setReadingBook(null)} />
        </Suspense>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function CatalogStatus({
  status,
  onRetry,
}: {
  status: LoadStatus;
  onRetry: () => void;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      {status === "loading" ? (
        <div className="w-8 h-8 border-2 border-[#315C4C]/20 border-t-[#315C4C] rounded-full animate-spin mx-auto" />
      ) : (
        <>
          <h3 className="text-lg font-semibold text-[#292824]">
            Não foi possível carregar o catálogo
          </h3>
          <p className="text-sm text-[#7A7264] mt-1">
            Verifique sua conexão e tente novamente.
          </p>
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-2 text-sm text-[#315C4C] border border-[rgba(49,92,76,0.2)] rounded-lg hover:bg-[rgba(49,92,76,0.05)] transition-colors"
          >
            Tentar novamente
          </button>
        </>
      )}
    </div>
  );
}
