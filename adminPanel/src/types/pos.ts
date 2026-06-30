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
   customerId?: number;     
  odooOrderId?: number; 
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
  supplierInvoiceNumber?: string;
}
export interface Category {
  odooCategoryId: string | number;
  catTitle: string;
}

export type CardBrand = "visa" | "mastercard" | "amex";
 
export type PaymentLine =
  | { method: "cash";  amount: number }
  | { method: "card";  amount: number; cardBrand: CardBrand }
 
  | { method: "check"; amount: number; checkNumber: string };
 
export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  street?: string;       
  city?: string;         
  country?: string;    
  company?: string;  
  isTaxExempt?: boolean;
}

export function fmt(n: number) {
  return n.toFixed(2);
}
export const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

export function calcLineTotal(item: CartItem) {
  const base = item.price * item.qty;
  const discount = item.discount || 0;
  return base - (base * discount) / 100;
}

export const TAX_RATE = 0.17; 

export function calcOrderTotals(cart: CartItem[], taxRate: number = TAX_RATE) {
  const subtotal = cart.reduce(
    (s, item) => s + item.price * item.qty * (1 - (item.discount ?? 0) / 100),
    0,
  );
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

export interface CreateCustomerResponse {
  customerId: number;
}