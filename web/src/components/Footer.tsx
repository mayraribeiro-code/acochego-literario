import { BookOpen } from "lucide-react";
import type { View } from "../types";

export function Footer({ onNavigate }: { onNavigate: (v: View) => void }) {
  const link = "text-white/60 hover:text-white text-sm transition-colors";
  return (
    <footer className="bg-[#1F3D33] py-10 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span
              className="font-bold text-white text-lg"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Aconchego Literário
            </span>
          </div>
          <nav aria-label="Rodapé" className="flex items-center gap-5">
            <button onClick={() => onNavigate("catalog")} className={link}>
              Catálogo
            </button>
            <button onClick={() => onNavigate("privacy")} className={link}>
              Política de Privacidade
            </button>
          </nav>
          <p className="text-white/35 text-xs">
            © {new Date().getFullYear()} Aconchego Literário
          </p>
        </div>
      </div>
    </footer>
  );
}
