export interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  discount?: number;
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
  qty_available: number;
  image_url?: string;
  catTitle?: string;
}

export interface Category {
  odooCategoryId: string | number;
  catTitle: string;
}