/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ShoppingCart, MapPin, User, Phone, Mail } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useCartStore from "@/src/stores/cartStore";
import { ShippingFormInputs } from "@/src/types";
import { useCreateOrderMutation } from "@/redux/order/orderApi";
import { toast } from "react-toastify";

const ReviewOrder = ({ shippingForm }: { shippingForm: ShippingFormInputs }) => {
  const { cart, clearCart } = useCartStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [createOrder] = useCreateOrderMutation();

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

const handlePlaceOrder = async () => {
  setIsLoading(true);
  try {
    const items = cart.map((item) => ({
      productId: item.id,
      quantity: item.quantity,
      price: item.price,
      variantInfo: {
        color: item.selectedColor,
        size: item.selectedSize,
      },
    }));

  
    await createOrder({
      items,
      shippingAddress: {
        name: shippingForm.name,
        email: shippingForm.email,
        phone: shippingForm.phone,
        city: shippingForm.city,
        address: shippingForm.address,
      },
    }).unwrap();

    clearCart();
    toast.success("Order placed! Waiting for confirmation.");
    router.push("/order-success");
  } catch (err: any) {
    toast.error(err?.data?.message || "Something went wrong");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="flex flex-col gap-6">

      {/* SHIPPING INFO */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-500" /> Shipping To
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-gray-400" />
            {shippingForm.name}
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            {shippingForm.email}
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            {shippingForm.phone}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            {shippingForm.city}
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2 pt-2 border-t border-gray-200">
          {shippingForm.address}
        </p>
      </div>

      {/* ORDER ITEMS */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-700">Items</h3>
        {cart.map((item) => (
          <div
            key={item.id + item.selectedSize + item.selectedColor}
            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-none text-sm"
          >
            <div className="flex flex-col">
              <span className="font-medium text-gray-800">{item.name}</span>
              <span className="text-xs text-gray-400">
                {item.selectedSize} · {item.selectedColor} · ×{item.quantity}
              </span>
            </div>
            <span className="font-semibold text-gray-900">
              ${(item.price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* TOTAL */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-sm text-gray-500">Total</span>
        <span className="text-xl font-bold text-indigo-600">${total.toFixed(2)}</span>
      </div>

      {/* NOTE */}
      <p className="text-xs text-gray-400 text-center">
        Your order will be reviewed by our team and confirmed shortly via email.
      </p>

      {/* PLACE ORDER BUTTON */}
      <button
        onClick={handlePlaceOrder}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600
        text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2
        transition-all active:scale-95 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <ShoppingCart className="w-4 h-4" />
            Place Order
          </>
        )}
      </button>
    </div>
  );
};

export default ReviewOrder;