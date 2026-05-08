/* eslint-disable @typescript-eslint/no-explicit-any */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartStoreActionsType, CartStoreStateType } from "../types";

const useCartStore = create<CartStoreStateType & CartStoreActionsType>()(
  persist(
    (set:any) => ({
      cart: [],
      hasHydrated: false,
      addToCart: (product:any) =>
        set((state:any) => {
          const existingIndex = state.cart.findIndex(
            (p:any) =>
              p.id === product.id &&
              p.selectedSize === product.selectedSize &&
              p.selectedColor === product.selectedColor
          );

          if (existingIndex !== -1) {
            const updatedCart = [...state.cart];
            updatedCart[existingIndex].quantity += product.quantity || 1;
            return { cart: updatedCart };
          }

          return {
            cart: [
              ...state.cart,
              {
                ...product,
                quantity: product.quantity || 1,
                selectedSize: product.selectedSize,
                selectedColor: product.selectedColor,
              },
            ],
          };
        }),
      removeFromCart: (product:any) =>
        set((state:any) => ({
          cart: state.cart.filter(
            (p:any) =>
              !(
                p.id === product.id &&
                p.selectedSize === product.selectedSize &&
                p.selectedColor === product.selectedColor
              )
          ),
        })),
      clearCart: () => set({ cart: [] }),

      updateQuantity: (product: any, type: "inc" | "dec") =>
  set((state: any) => {
    const updatedCart = state.cart.map((item: any) => {
      if (
        item.id === product.id &&
        item.selectedSize === product.selectedSize &&
        item.selectedColor === product.selectedColor
      ) {
        return {
          ...item,
          quantity:
            type === "inc"
              ? item.quantity + 1
              : Math.max(1, item.quantity - 1),
        };
      }
      return item;
    });

    return { cart: updatedCart };
  }),
    }),
    {
      name: "cart",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state:any) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    }
  )
);

export default useCartStore;