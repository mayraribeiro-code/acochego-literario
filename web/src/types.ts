export type View =
  | "home"
  | "catalog"
  | "bookDetail"
  | "library"
  | "admin"
  | "account"
  | "privacy";
export type AuthMode = "login" | "register";

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  year: number;
  price: number;
  synopsis: string;
  rating: number;
  reviews: number;
  coverFrom: string;
  coverTo: string;
  coverText: string;
  // Imagem de capa enviada pelo admin; sem ela, a capa é desenhada com as cores.
  coverUrl: string | null;
  available: boolean;
  format: string;
  active: boolean;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  author: string;
  date: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: "client" | "admin";
}

export interface AdminSummary {
  activeBooks: number;
  purchases: number;
  clients: number;
  revenue: number;
}

export interface AdminPurchase {
  id: string;
  client: string;
  book: string;
  date: string;
  value: number;
  status: "iniciada" | "confirmada" | "cancelada" | "falha";
  method: "cartao" | "pix" | "gratuito" | null;
  cardLast4: string | null;
  failureReason: string | null;
}
