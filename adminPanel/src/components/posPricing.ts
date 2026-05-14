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

export function calcTax(amount: number, rate = 0.1) {
  return amount * rate;
}

export function calcTotal(cart: CartItem[], discount: Discount) {
  const subtotal = calcSubtotal(cart);
  const discountAmt = calcDiscountAmount(subtotal, discount);
  const afterDiscount = Math.max(0, subtotal - discountAmt);
  const tax = calcTax(afterDiscount);

  return {
    subtotal,
    discountAmt,
    afterDiscount,
    tax,
    total: afterDiscount + tax,
  };
}