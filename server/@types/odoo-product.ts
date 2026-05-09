export type OdooProduct = {
  id: number;
  display_name: string;
  lst_price: number;
  qty_available: number;
  image_1920?: string;
  default_code?: string;
  attribute_value_ids: number[];
};