import { CartItem } from "@/types/pos";

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

export function calcTax(amount: number, rate: number) {
  return Math.round(amount * rate * 100) / 100;
}

export function calcTotal(
  cart: CartItem[],
  discount: Discount,
  effectiveTaxRate: number,
) {
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

  const tax = Math.round(afterDiscount * effectiveTaxRate * 100) / 100;

  const total = Math.round((afterDiscount + tax) * 100) / 100;

  return {
    subtotal,
    discountAmt,
    afterDiscount,
    tax,
    total,
  };
}