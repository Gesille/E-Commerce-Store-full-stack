"use client";

import { useGetProductByIdQuery } from "@/redux/product/productApi";
import ProductInteraction from "@/src/components/ProductInteraction";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";

const colorMap: Record<string, string> = {
  gray: "#9CA3AF",
  purple: "#A855F7",
  green: "#22C55E",
};

const ProductPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();

  const id = params?.id as string;

  const { data, isLoading, error } = useGetProductByIdQuery(id, {
    skip: !id,
  });

  const size = searchParams.get("size");
  const color = searchParams.get("color");

  if (isLoading)
    return <p className="text-center py-10">Loading...</p>;

  if (error)
    return (
      <p className="text-center text-red-500">
        Error loading product
      </p>
    );

  const product = data?.product;

  if (!product) return <p>No product found</p>;

  // ✅ SAFE DATA NORMALIZATION (IMPORTANT)
  const sizes =
    product?.attributes?.sizes?.length > 0
      ? product.attributes.sizes
      : ["Standard"];

  const colors =
    product?.attributes?.colors?.length > 0
      ? product.attributes.colors
      : ["gray"];

  const imageUrl =
    product?.image
      ? `data:image/png;base64,${product.image}`
      : "/placeholder.png";

  const images =
    product?.attributes?.images ?? {
      [colors[0]]: imageUrl,
    };

  const selectedSize = size || sizes[0];
  const selectedColor = color || colors[0];

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* IMAGE SECTION */}
          <div className="lg:sticky lg:top-24">
            <div
              className="relative rounded-3xl p-10 shadow-xl border overflow-hidden"
              style={{
                background: `radial-gradient(circle at top, ${
                  colorMap[selectedColor] || "#ccc"
                }15, white 60%)`,
              }}
            >
              <div className="relative w-full aspect-square max-w-[420px] mx-auto">
  <Image
    src={images[selectedColor] || imageUrl}
    alt={product.name}
    fill
    sizes="(max-width: 668px) 90vw, vw"
    className="object-contain drop-shadow-lg"
    priority
    quality={100}
  />
</div>
            </div>

            {/* COLOR DOTS */}
            <div className="flex justify-center gap-3 mt-6">
              {colors.map((c: string) => (
                <div
                  key={c}
                  className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: colorMap[c] || c }}
                />
              ))}
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex flex-col gap-7">

            {/* TITLE */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                {product.name}
              </h1>
              <p className="text-gray-500 mt-3 leading-relaxed">
                {product.shortDescription}
              </p>
            </div>

            {/* PRICE */}
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-gray-900">
                ${product.price?.toFixed(2)}
              </span>

              {product.stock > 5 ? (
                <span className="px-3 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  In Stock
                </span>
              ) : product.stock > 0 ? (
                <span className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">
                  Only {product.stock} left ⚠️
                </span>
              ) : (
                <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-600 font-medium">
                  Out of Stock ❌
                </span>
              )}
            </div>

            {/* PRODUCT ACTION */}
            <div className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition">
              <ProductInteraction
                product={{
                  ...product,
                  sizes,
                  colors,
                }}
                selectedSize={selectedSize}
                selectedColor={selectedColor}
              />
            </div>

            {/* FEATURES */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border">
                🚚 Fast Shipping
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border">
                🔒 Secure Pay
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border">
                ↩ Easy Returns
              </div>
            </div>

            {/* PAYMENT */}
            <div className="flex gap-3">
              <div className="bg-white border rounded-lg px-3 py-2">
                <Image src="/klarna.png" alt="" width={50} height={25} />
              </div>
              <div className="bg-white border rounded-lg px-3 py-2">
                <Image src="/cards.png" alt="" width={50} height={25} />
              </div>
              <div className="bg-white border rounded-lg px-3 py-2">
                <Image src="/stripe.png" alt="" width={50} height={25} />
              </div>
            </div>

            {/* NOTE */}
            <p className="text-xs text-gray-400 leading-relaxed">
              By purchasing you agree to our Terms & Privacy Policy. Secure checkout enabled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;