"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { SubmitHandler, useForm } from "react-hook-form";
import { ShippingFormInputs, shippingFormSchema } from "../types";
import { zodResolver } from "@hookform/resolvers/zod";

const ShippingForm = ({
  setShippingForm,
}: {
  setShippingForm: (data: ShippingFormInputs) => void;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingFormInputs>({
    resolver: zodResolver(shippingFormSchema),
  });

  const router = useRouter();

  const handleShippingForm: SubmitHandler<ShippingFormInputs> = (data) => {
    setShippingForm(data);
    router.push("/cart?step=3", { scroll: false });
  };

  return (
    <form
      onSubmit={handleSubmit(handleShippingForm)}
      className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col gap-6"
    >
      {/* TITLE */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-gray-900">
          Shipping Details
        </h2>
        <p className="text-sm text-gray-500">
          Please enter your delivery information
        </p>
      </div>

      {/* GRID */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* NAME */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Name</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder="John Doe"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* EMAIL */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Email</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder="johndoe@gmail.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* PHONE */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Phone</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder="123456789"
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-xs text-red-500">{errors.phone.message}</p>
          )}
        </div>

        {/* CITY */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">City</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder="New York"
            {...register("city")}
          />
          {errors.city && (
            <p className="text-xs text-red-500">{errors.city.message}</p>
          )}
        </div>
      </div>

      {/* ADDRESS FULL WIDTH */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Address</label>
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          placeholder="123 Main St, Anytown"
          {...register("address")}
        />
        {errors.address && (
          <p className="text-xs text-red-500">{errors.address.message}</p>
        )}
      </div>

      {/* BUTTON */}
      <button
        type="submit"
        className="w-full mt-2 bg-linear-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
};

export default ShippingForm;