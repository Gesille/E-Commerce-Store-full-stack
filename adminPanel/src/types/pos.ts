export interface CartItem {
  note: string;
  id: number;
  name: string;
  price: number;
  unitPrice: number;
  qty: number;
  discount?: number;
  size?: string;
  color?: string;
  material?: string;
  productId: number;
}

export interface Order {
  id: number;
  name: string;
  cart: CartItem[];
  createdAt: Date;
}

export interface Product {
  id: string | number;
  name: string;
  reference: string;
  shortDescription: string;
  description: string;
  price: number;
  sizes: string[];
  colors: string[];
  images?: Record<string, string>;
  stock: number;
  materials: string[];
}
export interface Category {
  odooCategoryId: string | number;
  catTitle: string;
}

export interface PaymentLine {
  method: "cash" | "card" | "bank";
  amount: number;
}
export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

export function fmt(n: number) {
  return n.toFixed(2);
}

export function calcLineTotal(item: CartItem) {
  const base = item.price * item.qty;
  const discount = item.discount || 0;

  return base - (base * discount) / 100;
}

export function calcOrderTotals(cart: CartItem[]) {
  const subtotal = cart.reduce(
    (s, item) => s + item.price * item.qty * (1 - (item.discount ?? 0) / 100),
    0,
  );
  return { subtotal, tax: 0, total: subtotal };
}
export interface CreateCustomerResponse {
  customerId: number;
}