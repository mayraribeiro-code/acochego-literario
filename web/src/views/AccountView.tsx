import { useState } from "react";
import { KeyRound, UserRound, UserX } from "lucide-react";
import type { AppUser } from "../types";
import {
  ApiError,
  MIN_PASSWORD,
  changePassword,
  deactivateAccount,
  updateName,
} from "../lib/api";

const inputCls =
  "w-full px-3 py-2 text-sm bg-white border border-[rgba(49,92,76,0.15)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#315C4C]/20 focus:border-[#315C4C] disabled:bg-stone-50 disabled:text-[#7A7264]";
const primaryBtn =
  "px-4 py-2 bg-[#315C4C] text-white text-sm font-semibold rounded-lg hover:bg-[#1F3D33] transition-colors disabled:opacity-60";

// Erro de API vira a mensagem dela; o resto, a mensagem genérica.
function messageOf(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function AccountView({
  currentUser,
  onNameChange,
  onDeactivated,
  onMessage,
}: {
  currentUser: AppUser;
  onNameChange: (name: string) => void;
  onDeactivated: () => void;
  onMessage: (message: string) => void;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1
        className="text-2xl font-bold text-[#1F3D33]"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Minha conta
      </h1>
      <ProfileCard currentUser={currentUser} onNameChange={onNameChange} onMessage={onMessage} />
      <PasswordCard onMessage={onMessage} />
      {currentUser.role === "client" && (
        <DeactivateCard onDeactivated={onDeactivated} />
      )}
    </div>
  );
}

function Card({
  icon,
  title,
  children,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={`bg-white rounded-xl border p-5 shadow-sm ${
        danger ? "border-red-100" : "border-[rgba(49,92,76,0.1)]"
      }`}
    >
      <h2
        className={`flex items-center gap-2 font-semibold mb-4 ${
          danger ? "text-red-700" : "text-[#292824]"
        }`}
      >
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[#292824]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ProfileCard({
  currentUser,
  onNameChange,
  onMessage,
}: {
  currentUser: AppUser;
  onNameChange: (name: string) => void;
  onMessage: (message: string) => void;
}) {
  const [name, setName] = useState(currentUser.name);
  const [busy, setBusy] = useState(false);
  const changed = name.trim() !== currentUser.name;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      onMessage("Informe seu nome.");
      return;
    }
    setBusy(true);
    try {
      await updateName(trimmed);
      onNameChange(trimmed);
      setName(trimmed);
      onMessage("Nome atualizado.");
    } catch (err) {
      onMessage(messageOf(err, "Não foi possível salvar o nome."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card icon={<UserRound className="w-4 h-4 text-[#315C4C]" />} title="Dados pessoais">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoComplete="name"
            className={inputCls}
          />
        </Field>
        <Field label="E-mail">
          <input value={currentUser.email} disabled className={inputCls} />
        </Field>
        <button type="submit" disabled={busy || !changed} className={primaryBtn}>
          {busy ? "Salvando…" : "Salvar nome"}
        </button>
      </form>
    </Card>
  );
}

function PasswordCard({ onMessage }: { onMessage: (message: string) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!current || !next) return setError("Preencha a senha atual e a nova.");
    if (next.length < MIN_PASSWORD)
      return setError(`A nova senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
    if (next !== confirm) return setError("A confirmação não confere com a nova senha.");
    if (next === current) return setError("A nova senha deve ser diferente da atual.");

    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      onMessage("Senha alterada. As sessões em outros aparelhos foram encerradas.");
    } catch (err) {
      setError(messageOf(err, "Não foi possível alterar a senha."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card icon={<KeyRound className="w-4 h-4 text-[#315C4C]" />} title="Alterar senha">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Senha atual">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className={inputCls}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nova senha">
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
            />
          </Field>
          <Field label="Confirmar nova senha">
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
            />
          </Field>
        </div>
        <p className="text-xs text-[#7A7264]">
          Mínimo de {MIN_PASSWORD} caracteres. Ao trocar, você sai dos outros aparelhos.
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? "Alterando…" : "Alterar senha"}
        </button>
      </form>
    </Card>
  );
}

function DeactivateCard({ onDeactivated }: { onDeactivated: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password) return setError("Digite sua senha para confirmar.");
    setBusy(true);
    try {
      await deactivateAccount(password);
      onDeactivated();
    } catch (err) {
      setError(messageOf(err, "Não foi possível desativar a conta."));
      setBusy(false);
    }
  }

  return (
    <Card icon={<UserX className="w-4 h-4" />} title="Desativar conta" danger>
      <p className="text-sm text-[#292824] leading-relaxed">
        Você perde o acesso ao site e à sua biblioteca, e não consegue mais entrar com este
        e-mail. Seus livros comprados continuam registrados.
      </p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 px-4 py-2 text-sm font-semibold text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          Quero desativar minha conta
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="Digite sua senha para confirmar">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputCls}
              autoFocus
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {busy ? "Desativando…" : "Desativar conta"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPassword("");
                setError("");
              }}
              disabled={busy}
              className="px-4 py-2 text-sm text-[#7A7264] hover:text-[#292824] transition-colors"
            >
              Voltar
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
