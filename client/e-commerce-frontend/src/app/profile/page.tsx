/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  useUpdateAvatarMutation,
  useUpdateProfileMutation,
} from "@/redux/user/userApi";
import { useGetPurchasedProductsQuery } from "@/redux/order/orderApi";
import ProductCard from "@/src/components/ProductCard";
import ChangePassword from "./ChangePassword";

export default function ProfilePage() {
  const { user } = useSelector((state: any) => state.auth);

 const [tab, setTab] = useState<"profile" | "orders" | "password">("profile");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [updateProfilePicture, { isLoading: avatarLoading }] =
    useUpdateAvatarMutation();

  const [updateProfile, { isLoading: profileLoading }] =
    useUpdateProfileMutation();
const { data: ordersData =[], isLoading: ordersLoading } =
  useGetPurchasedProductsQuery();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    image: "",
    street: "",
    city: "",
    country: "",
    zip: "",
  });

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      image: user.avatar?.url ?? "",
      street: user.address?.street ?? "",
      city: user.address?.city ?? "",
      country: user.address?.country ?? "",
      zip: user.address?.zip ?? "",
    });
  }, [user]);

  if (!user) {
    return (
      <div className="p-10 text-center text-gray-500">
        Checking authentication...
      </div>
    );
  }


const imageHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onloadend = async () => {
    const avatar = reader.result as string;

    try {
      await updateProfilePicture({ avatar }).unwrap();
      toast.success("Profile picture updated");
    } catch {
      toast.error("Upload failed");
    }
  };

  reader.readAsDataURL(file);
};
  const handleSave = async () => {
    try {
      setLoading(true);

      await updateProfile({
        name: form.name,
        phone: form.phone,
        address: {
          street: form.street,
          city: form.city,
          country: form.country,
          zip: form.zip,
        },
      }).unwrap();

      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">

      {/* HEADER (classic + soft accent) */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-6">

          {/* AVATAR */}
          <div className="relative w-28 h-28 group">
            {form.image ? (
              <Image
                src={form.image}
                alt="avatar"
                fill
                className="rounded-full object-cover border-4 border-white shadow"
                unoptimized
              />
            ) : (
              <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600">
                {form.name?.charAt(0) || "U"}
              </div>
            )}

            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-full cursor-pointer">
              <Camera size={20} className="text-white" />
              <input
                type="file"
                hidden
                onChange={imageHandler}
              />
            </label>
          </div>

          {/* INFO */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {form.name}
            </h2>
            <p className="text-gray-500">{form.email}</p>

            <span className="inline-block mt-2 text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
              {user.role}
            </span>
          </div>

        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-3 bg-white border border-gray-200 p-2 rounded-2xl w-fit shadow-sm">
        <button
          onClick={() => setTab("profile")}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
            tab === "profile"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          Profile
        </button>

        <button
          onClick={() => setTab("orders")}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
            tab === "orders"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          Orders
        </button>
        <button
  onClick={() => setTab("password")}
  className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
    tab === "password"
      ? "bg-blue-600 text-white"
      : "text-gray-600 hover:text-blue-600"
  }`}
>
  Change Password
</button>
      </div>

      {/* PROFILE */}
      {tab === "profile" && (
        <>
          <div className="grid md:grid-cols-2 gap-6">

            {/* LEFT */}
            <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-gray-900">
                Personal Info
              </h3>

              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-50 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Full Name"
              />

              <input
                value={form.email}
                disabled
                className="w-full bg-gray-100 p-3 rounded-xl text-gray-500"
              />

              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-gray-50 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Phone"
              />
            </div>

            {/* RIGHT */}
            <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-gray-900">
                Address
              </h3>

              <input
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className="w-full bg-gray-50 p-3 rounded-xl"
                placeholder="Street"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-gray-50 p-3 rounded-xl"
                  placeholder="City"
                />

                <input
                  value={form.country}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                  className="bg-gray-50 p-3 rounded-xl"
                  placeholder="Country"
                />
              </div>

              <input
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                className="w-full bg-gray-50 p-3 rounded-xl"
                placeholder="ZIP Code"
              />
            </div>
          </div>

          {/* SAVE */}
          <button
            onClick={handleSave}
            disabled={loading || avatarLoading || profileLoading || uploading}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition"
          >
            {loading || avatarLoading || profileLoading || uploading
              ? "Saving..."
              : "Save Changes"}
          </button>
        </>
      )}

      {/* ORDERS */}
     {tab === "orders" && (
  <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm">

    <h2 className="text-xl font-bold mb-6">My Orders</h2>

    {ordersLoading ? (
      <p>Loading...</p>
    ) : ordersData?.length === 0 ? (
      <p>No orders</p>
    ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
       {ordersData.map((item: any, i: number) => {
  if (!item.product) return null;

const formattedProduct = {
  id: item.product.id,
  name: item.product.name,
  price: item.price,
  reference:item.reference,
  // ✅ BOTH REQUIRED
  description: item.product.description || "",
  shortDescription: item.product.description || "",

  stock: 1,

  sizes: [item.variant?.size || "Default"],
  colors: [item.variant?.color || "gray"],

  images: {
    [item.variant?.color || "gray"]:
      item.product.image || "/no-image.png",
  },
};

  return <ProductCard key={i} product={formattedProduct} showCartButton={false} />;
})}
      </div>
    )}
  </div>
)}
{tab === "password" && (
  <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm">
    <ChangePassword />
  </div>
)}

    </div>
  );
}