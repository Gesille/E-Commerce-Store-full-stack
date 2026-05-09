export interface CleanProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
  image?: string | false;

  attributes: {
    brand?: string;
    size?: string;
    material?: string;
  };
}