import { CartItem, TAX_RATE } from "@/types/pos";

export type Discount =
  | { type: "percent"; value: number }
  | { type: "fixed"; value: number };

export function calcSubtotal(cart: CartItem[]) {
  return cart.reduce((acc, i) => acc + i.price * i.qty, 0);
}

export function calcDiscountAmount(subtotal: number, discount: Discount) {
  if (discount.type === "percent") {
    return subtotal * (discount.value / 100);
  }
  return discount.value;
}

export function calcTax(amount: number, rate = 0.1) {
  return amount * rate;
}

export function calcTotal(cart: CartItem[], discount: Discount) {
  const subtotal = cart.reduce(
    (s, item) =>
      s + item.price * item.qty * (1 - (item.discount ?? 0) / 100),
    0
  );

  const discountAmt =
    discount.type === "percent"
      ? subtotal * (discount.value / 100)
      : discount.value;

  const afterDiscount = subtotal - discountAmt;

  const tax = afterDiscount * TAX_RATE;

  const total = afterDiscount + tax;

  return {
    subtotal,
    discountAmt,
    afterDiscount,
    tax,
    total,
  };
}