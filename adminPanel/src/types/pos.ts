export interface CartItem {
  note: string;
  id: number;
  name: string;
  price: number;
  qty: number;
  discount?: number;

  size?: string;
  color?: string;
  material?: string;
}
export interface Order {
  id: number;
  name: string;
  cart: CartItem[];
  createdAt: Date;
}
export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;        
  image?: string;      
  reference?: string;

  attributes?: {
    brand?: string;
    sizes?: string[];
    colors?: string[];
    materials?: string[];
  };
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
  return item.price * item.qty * (1 - (item.discount || 0) / 100);
}

export function calcOrderTotals(cart: CartItem[]) {
  const subtotal = cart.reduce((acc, i) => acc + calcLineTotal(i), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}