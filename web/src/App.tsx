import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { BookX, Lock } from "lucide-react";
import type { AppUser, AuthMode, Book, View } from "./types";
import {
  fetchBooks,
  fetchGenres,
  fetchLibrary,
  fetchMe,
  getToken,
  keepSessionAlive,
  signOut,
} from "./lib/api";
import { documentTitle, parsePath, pathFor, type Route } from "./lib/routes";
import { Header } from "./components/Header";
import { AuthModal } from "./components/AuthModal";
import { PurchaseModal } from "./components/PurchaseModal";
import { Toast } from "./components/Toast";
import { HomeView } from "./views/HomeView";
import { CatalogView } from "./views/CatalogView";
import { BookDetailView } from "./views/BookDetailView";
import { LibraryView } from "./views/LibraryView";
import { AdminView } from "./views/AdminView";
import { AccountView } from "./views/AccountView";
import { PrivacyView } from "./views/PrivacyView";
import { Footer } from "./components/Footer";

// O leitor (pdf.js e epub.js) só é baixado quando alguém abre um livro.
const ReaderView = lazy(() =>
  import("./views/ReaderView").then((m) => ({ default: m.ReaderView })),
);

type LoadStatus = "loading" | "error" | "ready";

// Marca as entradas do histórico criadas pelo próprio site: com ela, o
// "Voltar" da página de um livro usa o voltar do navegador.
interface HistoryState {
  fromApp?: boolean;
  reader?: boolean;
}
const historyState = () => (window.history.state ?? {}) as HistoryState;

export default function App() {
  const [route, setRoute] = useState<Route>(() => parsePath(window.location.pathname));
  const { view } = route;

  const [books, setBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<LoadStatus>("loading");

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  // Enquanto a sessão salva é restaurada, as telas logadas esperam em vez de
  // mostrar "entre na sua conta" (importante ao dar F5 nessas telas).
  const [sessionChecked, setSessionChecked] = useState(() => !getToken());
  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const purchasedIds = new Set(myBooks.map((b) => b.id));

  // O livro da página de detalhe sai das listas carregadas, então notas e
  // médias atualizadas aparecem sozinhas. Livro desativado só existe na
  // biblioteca de quem comprou.
  const selectedBook =
    view === "bookDetail"
      ? (books.find((b) => b.id === route.bookId) ??
        myBooks.find((b) => b.id === route.bookId) ??
        null)
      : null;

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
    // Se o token salvo já passou da metade do prazo, renova antes de usá-lo.
    if (!getToken()) return;
    keepSessionAlive()
      .then(() => fetchMe(getToken() ?? ""))
      .then(startSession)
      .catch(() => signOut())
      .finally(() => setSessionChecked(true));
  }, []);

  // Voltar/avançar do navegador: muda de tela e fecha o leitor, se aberto.
  useEffect(() => {
    const onPop = () => {
      setRoute(parsePath(window.location.pathname));
      if (!historyState().reader) setReadingBook(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    document.title = documentTitle(view, selectedBook?.title);
  }, [view, selectedBook?.title]);

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

  // Atualiza notas e médias depois de uma avaliação, sem a tela de carregamento.
  async function refreshRatings() {
    try {
      setBooks(await fetchBooks());
      if (currentUser?.role === "client") setMyBooks(await fetchLibrary());
    } catch {
      // Os números voltam a ficar certos no próximo carregamento do catálogo.
    }
  }

  function go(next: Route) {
    const path = pathFor(next);
    if (path !== window.location.pathname) {
      window.history.pushState({ fromApp: true } satisfies HistoryState, "", path);
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigate(v: View) {
    go({ view: v });
  }

  function selectBook(book: Book) {
    go({ view: "bookDetail", bookId: book.id });
  }

  // Volta para onde a pessoa estava; se ela chegou direto pelo endereço do
  // livro (ex.: link ou F5), vai para o catálogo.
  function leaveBook() {
    if (historyState().fromApp) window.history.back();
    else navigate("catalog");
  }

  // O leitor ganha uma entrada no histórico: o "voltar" do navegador o fecha.
  function openReader(book: Book) {
    window.history.pushState(
      { fromApp: true, reader: true } satisfies HistoryState,
      "",
      window.location.pathname,
    );
    setReadingBook(book);
  }

  const closeReader = useCallback(() => {
    if (historyState().reader) window.history.back();
    else setReadingBook(null);
  }, []);

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

  function clearSession(message: string) {
    setReadingBook(null);
    setCurrentUser(null);
    setMyBooks([]);
    navigate("home");
    setToast(message);
  }

  function handleLogout() {
    signOut();
    clearSession("Sessão encerrada com sucesso.");
  }

  // A API já recusou o token; só limpa a sessão local.
  function handleDeactivated() {
    clearSession("Sua conta foi desativada.");
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

  // Telas que exigem login (e, no admin, o perfil certo).
  function restricted(allowed: boolean, content: () => React.ReactNode) {
    if (!sessionChecked) return <Spinner />;
    if (!currentUser) {
      return (
        <Notice
          icon={<Lock className="w-8 h-8 text-[#315C4C]/50" />}
          title="Entre na sua conta"
          text="Esta página é só para quem está logado."
          action={{ label: "Entrar", onClick: () => openAuth("login") }}
        />
      );
    }
    if (!allowed) {
      return (
        <Notice
          icon={<Lock className="w-8 h-8 text-[#315C4C]/50" />}
          title="Página indisponível"
          text="Sua conta não tem acesso a esta página."
          action={{ label: "Ir para o início", onClick: () => navigate("home") }}
        />
      );
    }
    return content();
  }

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

        {view === "bookDetail" &&
          (selectedBook ? (
            <BookDetailView
              book={selectedBook}
              currentUser={currentUser}
              purchased={purchasedIds.has(selectedBook.id)}
              onBack={leaveBook}
              onBuy={handleBuy}
              onOpenAuth={openAuth}
              onRead={() => openReader(selectedBook)}
              onMessage={setToast}
              onReviewsChange={refreshRatings}
            />
          ) : catalogStatus === "loading" || !sessionChecked ? (
            <Spinner />
          ) : catalogStatus === "error" ? (
            <CatalogStatus status="error" onRetry={loadCatalog} />
          ) : (
            <Notice
              icon={<BookX className="w-8 h-8 text-[#315C4C]/50" />}
              title="Livro não encontrado"
              text="Este livro não está mais no catálogo ou o endereço está incorreto."
              action={{ label: "Ver o catálogo", onClick: () => navigate("catalog") }}
            />
          ))}

        {view === "library" &&
          restricted(currentUser?.role === "client", () => (
            <LibraryView
              myBooks={myBooks}
              onRead={openReader}
              onSelectBook={selectBook}
              onExplore={() => navigate("catalog")}
              onMessage={setToast}
              readerOpen={readingBook !== null}
            />
          ))}

        {view === "account" &&
          restricted(true, () => (
            <AccountView
              currentUser={currentUser!}
              onNameChange={(name) => setCurrentUser({ ...currentUser!, name })}
              onDeactivated={handleDeactivated}
              onMessage={setToast}
            />
          ))}

        {view === "admin" &&
          restricted(currentUser?.role === "admin", () => (
            <AdminView onCatalogChange={loadCatalog} onMessage={setToast} />
          ))}

        {view === "privacy" && <PrivacyView />}
      </main>

      <Footer onNavigate={navigate} />

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
          <ReaderView book={readingBook} onClose={closeReader} />
        </Suspense>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function Spinner() {
  return (
    <div className="py-24">
      <div className="w-8 h-8 border-2 border-[#315C4C]/20 border-t-[#315C4C] rounded-full animate-spin mx-auto" />
    </div>
  );
}

function Notice({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: { label: string; onClick: () => void };
}) {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-white border border-[rgba(49,92,76,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h2
        className="text-xl font-bold text-[#1F3D33]"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {title}
      </h2>
      <p className="text-sm text-[#7A7264] mt-1">{text}</p>
      <button
        onClick={action.onClick}
        className="mt-5 px-4 py-2 bg-[#315C4C] text-white text-sm font-semibold rounded-lg hover:bg-[#1F3D33] transition-colors"
      >
        {action.label}
      </button>
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
  if (status === "loading") return <Spinner />;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
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
    </div>
  );
}
