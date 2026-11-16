import { useEffect } from "react";
import { Check } from "lucide-react";

export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-[#1F3D33] text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-xs">
      <Check className="w-4 h-4 text-[#C6A15B] flex-shrink-0" />
      {message}
    </div>
  );
}
