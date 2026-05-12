"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import useBarcode from "@/hooks/useBarcode";
import { useLazyGetProductByBarcodeQuery } from "@/redux/product/productApi"; // 👈 Lazy not regular

type POSItem = {
  productId: number;
  name: string;
  reference: string;
  price: number;
  quantity: number;
};

const POSPage = () => {
  const [cart, setCart] = useState<POSItem[]>([]); // ✅ only once
  const [barcodeInput, setBarcodeInput] = useState(""); 
  const [triggerBarcode] =useLazyGetProductByBarcodeQuery()

  const handleScan = useCallback(async (code: string) => {
    try {
      const product = await triggerBarcode(code).unwrap();

      setCart((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          return prev.map((i) =>
            i.productId === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            reference: product.default_code,
            price: product.list_price,
            quantity: 1,
          },
        ];
      });

      toast.success(`✅ ${product.name} added`);
    } catch {
      toast.error("❌ Product not found");
    }
  }, [triggerBarcode]);

  useBarcode(handleScan);

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">POS</h1>
        <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && barcodeInput.trim()) {
              handleScan(barcodeInput.trim());
              setBarcodeInput(""); // clear after scan
            }
          }}
          placeholder="Type barcode or default_code and press Enter"
          className="border rounded-xl px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          autoFocus
        />
        <button
          onClick={() => {
            if (barcodeInput.trim()) {
              handleScan(barcodeInput.trim());
              setBarcodeInput("");
            }
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl"
        >
          Add
        </button>
      </div>
      <p className="text-gray-500 mb-6">Scan a barcode to add product</p>

      {cart.length === 0 ? (
        <p className="text-gray-400">Cart is empty</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="flex justify-between items-center border p-3 rounded-xl"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-400">{item.reference}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setCart((prev) =>
                      prev.map((i) =>
                        i.productId === item.productId
                          ? { ...i, quantity: Math.max(1, i.quantity - 1) }
                          : i
                      )
                    )
                  }
                  className="px-2 py-1 bg-gray-100 rounded"
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  onClick={() =>
                    setCart((prev) =>
                      prev.map((i) =>
                        i.productId === item.productId
                          ? { ...i, quantity: i.quantity + 1 }
                          : i
                      )
                    )
                  }
                  className="px-2 py-1 bg-gray-100 rounded"
                >
                  +
                </button>
                <button
                  onClick={() =>
                    setCart((prev) =>
                      prev.filter((i) => i.productId !== item.productId)
                    )
                  }
                  className="text-red-400 text-sm"
                >
                  Remove
                </button>
              </div>
              <p className="font-semibold">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}

          <div className="flex justify-between font-bold text-lg mt-4 border-t pt-4">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <button
            onClick={() => setCart([])}
            className="mt-2 text-sm text-red-500 underline"
          >
            Clear Cart
          </button>
        </div>
      )}
    </div>
  );
};

export default POSPage;