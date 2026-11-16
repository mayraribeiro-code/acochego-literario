import { useState } from "react";
import { BookOpen, X, Eye, EyeOff } from "lucide-react";
import type { AppUser, AuthMode } from "../types";
import { ApiError, MIN_PASSWORD, signIn, signUp } from "../lib/api";

export function AuthModal({
  mode,
  onClose,
  onSuccess,
  onSwitchMode,
}: {
  mode: AuthMode;
  onClose: () => void;
  onSuccess: (user: AppUser) => void;
  onSwitchMode: (m: AuthMode) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Preencha todos os campos.");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setError("Informe seu nome.");
      return;
    }
    if (mode === "register" && password.length < MIN_PASSWORD) {
      setError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    setLoading(true);
    try {
      const user =
        mode === "register"
          ? await signUp(name.trim(), email, password)
          : await signIn(email, password);
      onSuccess(user);
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
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Modal header image */}
        <div
          className="relative h-28 flex items-end pb-4 px-6 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1F3D33 0%, #315C4C 100%)",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=200&fit=crop&auto=format"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
          <div className="relative z-10 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <h2
            className="text-xl font-bold text-[#1F3D33] mb-1"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h2>
          <p className="text-sm text-[#7A7264] mb-5">
            {mode === "login"
              ? "Entre para continuar sua jornada de leitura."
              : "Comece a construir sua biblioteca pessoal."}
          </p>

          {mode === "register" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#292824] mb-1.5">
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full px-3 py-2.5 text-sm bg-[#F7F3EA] border border-[rgba(49,92,76,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#315C4C]/20 focus:border-[#315C4C] text-[#292824] placeholder-[#7A7264] transition-all"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#292824] mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="w-full px-3 py-2.5 text-sm bg-[#F7F3EA] border border-[rgba(49,92,76,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#315C4C]/20 focus:border-[#315C4C] text-[#292824] placeholder-[#7A7264] transition-all"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-[#292824] mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 text-sm bg-[#F7F3EA] border border-[rgba(49,92,76,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#315C4C]/20 focus:border-[#315C4C] text-[#292824] placeholder-[#7A7264] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7264] hover:text-[#292824] transition-colors"
              >
                {showPass ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#315C4C] text-white text-sm font-semibold rounded-lg hover:bg-[#1F3D33] transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>

          <p className="text-center text-sm text-[#7A7264] mt-4">
            {mode === "login" ? (
              <>
                Não tem conta?{" "}
                <button
                  type="button"
                  onClick={() => onSwitchMode("register")}
                  className="text-[#315C4C] font-medium hover:underline"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => onSwitchMode("login")}
                  className="text-[#315C4C] font-medium hover:underline"
                >
                  Entrar
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
