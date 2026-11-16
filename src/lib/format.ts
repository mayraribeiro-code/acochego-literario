export function fmt(price: number) {
  return `R$ ${price.toFixed(2).replace(".", ",")}`;
}

export function genreCls(genre: string) {
  const map: Record<string, string> = {
    Romance: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Naturalismo: "bg-orange-50 text-orange-700 border-orange-100",
    "Realismo Mágico": "bg-purple-50 text-purple-700 border-purple-100",
    Distopia: "bg-stone-100 text-stone-600 border-stone-200",
    Fábula: "bg-amber-50 text-amber-700 border-amber-100",
    Fantasia: "bg-green-50 text-green-700 border-green-100",
  };
  return map[genre] ?? "bg-stone-100 text-stone-600 border-stone-200";
}
