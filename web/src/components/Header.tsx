import { useState } from "react";
import { Search, BookOpen, X, LogOut, Library, Menu, Shield, UserCog } from "lucide-react";
import type { AppUser, AuthMode, View } from "../types";

export function Header({
  view,
  currentUser,
  onNavigate,
  onOpenAuth,
  onLogout,
  onSearch,
  searchQuery,
}: {
  view: View;
  currentUser: AppUser | null;
  onNavigate: (v: View) => void;
  onOpenAuth: (m: AuthMode) => void;
  onLogout: () => void;
  onSearch: (q: string) => void;
  searchQuery: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems = [
    { label: "Catálogo", view: "catalog" as View },
    ...(currentUser
      ? [{ label: "Minha Biblioteca", view: "library" as View }]
      : []),
    ...(currentUser?.role === "admin"
      ? [{ label: "Admin", view: "admin" as View }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#F7F3EA]/95 backdrop-blur-sm border-b border-[rgba(49,92,76,0.12)] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2.5 flex-shrink-0 group"
          >
            <div className="w-8 h-8 bg-[#315C4C] rounded-lg flex items-center justify-center shadow-sm group-hover:bg-[#1F3D33] transition-colors">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span
              className="font-bold text-[#1F3D33] hidden sm:block"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem" }}
            >
              Aconchego Literário
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-1">
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  view === item.view
                    ? "bg-[#315C4C] text-white"
                    : "text-[#292824] hover:bg-[rgba(49,92,76,0.08)] hover:text-[#315C4C]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Desktop search */}
          <div className="flex-1 max-w-xs hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7264]" />
              <input
                type="text"
                placeholder="Pesquisar livros..."
                value={searchQuery}
                onChange={(e) => {
                  onSearch(e.target.value);
                  if (e.target.value) onNavigate("catalog");
                }}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-[rgba(49,92,76,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#315C4C]/20 focus:border-[#315C4C] placeholder-[#7A7264] text-[#292824] transition-all"
              />
            </div>
          </div>

          {/* Auth / User menu */}
          <div className="ml-auto flex items-center gap-2">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[rgba(49,92,76,0.08)] transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-[#315C4C] flex items-center justify-center text-white text-xs font-bold">
                    {currentUser.name[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-[#292824]">
                    {currentUser.name.split(" ")[0]}
                  </span>
                </button>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-[rgba(49,92,76,0.1)] py-1 z-50">
                      <div className="px-3 py-2.5 border-b border-[rgba(49,92,76,0.08)]">
                        <p className="text-xs font-semibold text-[#292824]">
                          {currentUser.name}
                        </p>
                        <p className="text-xs text-[#7A7264] truncate">
                          {currentUser.email}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          onNavigate("library");
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#292824] hover:bg-[rgba(49,92,76,0.05)] transition-colors"
                      >
                        <Library className="w-4 h-4 text-[#315C4C]" />
                        Minha Biblioteca
                      </button>
                      {currentUser.role === "admin" && (
                        <button
                          onClick={() => {
                            onNavigate("admin");
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#292824] hover:bg-[rgba(49,92,76,0.05)] transition-colors"
                        >
                          <Shield className="w-4 h-4 text-[#315C4C]" />
                          Painel Admin
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onNavigate("account");
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#292824] hover:bg-[rgba(49,92,76,0.05)] transition-colors"
                      >
                        <UserCog className="w-4 h-4 text-[#315C4C]" />
                        Minha conta
                      </button>
                      <hr className="my-1 border-[rgba(49,92,76,0.08)]" />
                      <button
                        onClick={() => {
                          onLogout();
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth("login")}
                  className="hidden sm:block px-3 py-1.5 text-sm font-medium text-[#315C4C] hover:bg-[rgba(49,92,76,0.08)] rounded-lg transition-colors"
                >
                  Entrar
                </button>
                <button
                  onClick={() => onOpenAuth("register")}
                  className="px-3 py-1.5 text-sm font-medium bg-[#315C4C] text-white rounded-lg hover:bg-[#1F3D33] transition-colors shadow-sm"
                >
                  Criar conta
                </button>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-1.5 rounded-lg text-[#292824] hover:bg-[rgba(49,92,76,0.08)] transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7264]" />
            <input
              type="text"
              placeholder="Pesquisar livros..."
              value={searchQuery}
              onChange={(e) => {
                onSearch(e.target.value);
                if (e.target.value) onNavigate("catalog");
              }}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[rgba(49,92,76,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#315C4C]/20 focus:border-[#315C4C] placeholder-[#7A7264] text-[#292824]"
            />
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1">
            <button
              onClick={() => {
                onNavigate("home");
                setMobileOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === "home"
                  ? "bg-[#315C4C] text-white"
                  : "text-[#292824] hover:bg-[rgba(49,92,76,0.08)]"
              }`}
            >
              Início
            </button>
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => {
                  onNavigate(item.view);
                  setMobileOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === item.view
                    ? "bg-[#315C4C] text-white"
                    : "text-[#292824] hover:bg-[rgba(49,92,76,0.08)]"
                }`}
              >
                {item.label}
              </button>
            ))}
            {!currentUser && (
              <button
                onClick={() => {
                  onOpenAuth("login");
                  setMobileOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#315C4C] hover:bg-[rgba(49,92,76,0.08)] transition-colors"
              >
                Entrar
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
