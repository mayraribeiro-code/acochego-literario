import { Star } from "lucide-react";

export function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-4 h-4" : "w-3 h-3";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} ${
            s <= Math.round(rating)
              ? "fill-[#C6A15B] text-[#C6A15B]"
              : "text-stone-300"
          }`}
        />
      ))}
    </div>
  );
}
