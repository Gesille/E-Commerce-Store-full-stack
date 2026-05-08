"use client";

import ReviewOrder from "@/src/components/ReviewOrder";
import PaymentForm from "@/src/components/ReviewOrder";
import ShippingForm from "@/src/components/ShippingForm";
import useCartStore from "@/src/stores/cartStore";
import { ShippingFormInputs } from "@/src/types";
import { ArrowRight, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const steps = [
  { id: 1, title: "Shopping Cart" },
  { id: 2, title: "Shipping Address" },
  { id: 3, title: "Review Order" },
];

const CartPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [shippingForm, setShippingForm] = useState<ShippingFormInputs>();

  const activeStep = parseInt(searchParams.get("step") || "1");

  const { cart, removeFromCart } = useCartStore();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col gap-12">
        {/* TITLE */}
        <h1 className="text-4xl font-bold text-center text-gray-900 tracking-tight">
          Your Shopping Cart 🛒
        </h1>

        {/* STEPS */}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              <div
                className={`w-11 h-11 flex items-center justify-center rounded-full text-sm font-semibold transition-all duration-300
                ${
                  step.id === activeStep
                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg scale-110"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {step.id}
              </div>

              <span
                className={`text-sm font-medium ${
                  step.id === activeStep ? "text-indigo-600" : "text-gray-400"
                }`}
              >
                {step.title}
              </span>

              {step.id !== steps.length && (
                <div className="w-10 h-0.5 bg-gradient-to-r from-indigo-200 to-violet-200 rounded-full" />
              )}
            </div>
          ))}
        </div>

        {/* CONTENT */}
        <div className="grid lg:grid-cols-3 gap-10">
          {/* CART ITEMS */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-gray-100 p-6 flex flex-col gap-6">
            {activeStep === 1 ? (
              cart.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <div className="text-6xl mb-4">🛒</div>
                  <p>Your cart is empty</p>
                  <button
                    onClick={() => router.push("/products")}
                    className="mt-4 text-indigo-600 hover:underline"
                  >
                    Start shopping →
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id + item.selectedSize + item.selectedColor}
                    className="flex items-center justify-between py-2 border-b border-gray-500 last:border-none hover:bg-gradient-to-r hover:from-gray-50 hover:to-indigo-50 transition"
                  >
                    {/* LEFT */}
                    <div className="flex gap-5 items-center">
                      {/* IMAGE */}
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-50 border shadow-sm">
                        <Image
                       src={
    item.images?.[item.selectedColor] ||
    Object.values(item.images || {})[0] ||
    "/placeholder.png"
  }
                          alt={item.name}
                          fill
                          className="object-contain p-2"
                        />
                      </div>

                      {/* DETAILS */}
                      <div className="flex flex-col gap-1">
                        <p className="font-medium text-gray-900">{item.name}</p>

                        <div className="text-xs text-gray-500 flex flex-col gap-1 mt-1">
                          <span>• Qty: {item.quantity}</span>
                          <span>• Size: {item.selectedSize}</span>
                          <span>• Color: {item.selectedColor}</span>
                        </div>

                        <p className="font-semibold text-sm text-emerald-600 mt-1">
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* DELETE */}
                    <button
                      onClick={() => removeFromCart(item)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 hover:scale-110 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )
            ) : activeStep === 2 ? (
              <ShippingForm setShippingForm={setShippingForm} />
            ) : activeStep === 3 && shippingForm ? (
              <ReviewOrder shippingForm={shippingForm} />

            ) : (
              <p className="text-sm text-gray-500 text-center">
                Please fill in the shipping form to continue.
              </p>
            )}
          </div>

          {/* SUMMARY */}
          <div
            className="relative bg-white rounded-2xl p-6 flex flex-col gap-6 h-fit sticky top-24
            before:absolute before:inset-0 before:rounded-2xl before:p-[1px]
            before:bg-gradient-to-r before:from-indigo-200 before:via-violet-200 before:to-pink-200
            before:-z-10"
          >
            <h2 className="text-xl font-semibold text-gray-900">
              Order Summary
            </h2>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-medium text-gray-800">
                  $
                  {cart
                    .reduce((acc, item) => acc + item.price * item.quantity, 0)
                    .toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Discount</span>
                <span className="text-emerald-600 font-medium">- $10</span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span>$10</span>
              </div>

              <hr />

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-indigo-600">
                  $
                  {cart
                    .reduce((acc, item) => acc + item.price * item.quantity, 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>

            {activeStep === 1 && (
              <button
                onClick={() => router.push("/cart?step=2", { scroll: false })}
                className="mt-4 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500
                hover:from-indigo-600 hover:to-fuchsia-600 text-white py-3 rounded-xl flex items-center justify-center gap-2
                transition-all active:scale-95 shadow-lg"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
