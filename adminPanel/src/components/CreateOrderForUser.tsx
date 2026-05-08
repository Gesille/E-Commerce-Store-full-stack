"use client";

import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

import { ShoppingCart, Plus, Trash2, MapPin, User } from "lucide-react";

import toast from "react-hot-toast";
import { useManagerCreateOrderMutation } from "@/redux/order/orderApi";

const itemSchema = z.object({
  reference: z.string().min(1, "Product reference is required"),
  price: z.coerce.number().min(0, "Price must be positive"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
   name: z.string().min(1, "Product name is required"),
});

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  shippingAddress: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(1, "Phone is required"),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
  }),
  items: z.array(itemSchema).min(1, "At least one item is required"),
});

type FormValues = z.infer<typeof formSchema>;

const CreateOrderForUser = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
  email: "",
  shippingAddress: {
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  },
  items: [{ reference: "", name:"",price: 0, quantity: 1 }],
},
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const [managerCreateOrder, { isLoading }] = useManagerCreateOrderMutation(); 

  const onSubmit = async (data: FormValues) => {
    try {
      await managerCreateOrder(data).unwrap(); // ← updated
      toast.success("Order created successfully for user!");
      form.reset();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to create order");
    }
  };
  return (
    <SheetContent className="w-[460px] sm:w-[540px] p-0 bg-gradient-to-b from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <SheetHeader className="p-6 bg-indigo-50 border-b border-indigo-100">
        <SheetTitle className="text-xl font-semibold flex items-center gap-2 text-slate-800">
          <ShoppingCart size={18} /> Create Order for User
        </SheetTitle>
        <p className="text-sm text-slate-500">
          Place an order on behalf of a customer
        </p>
      </SheetHeader>

      <div className="p-5 max-h-[calc(100vh-140px)] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

           <FormField control={form.control} name="email" render={({ field }) => (
  <FormItem>
    <FormLabel className="flex items-center gap-2 text-indigo-700">
      <User size={14} /> Customer Email
    </FormLabel>
    <FormControl>
      <Input
        {...field}
        type="email"
        placeholder="customer@example.com"
        className="bg-white dark:bg-zinc-900 border-indigo-200 rounded-lg"
      />
    </FormControl>
    <FormMessage />
  </FormItem>
)} />

            {/* Shipping Address */}
         {/* Shipping Address Fields */}
<div className="space-y-3">
  <FormLabel className="flex items-center gap-2 text-emerald-700">
    <MapPin size={14} /> Shipping Address
  </FormLabel>

  {[
    { name: "shippingAddress.name",    label: "Full Name",    placeholder: "John Doe" },
    { name: "shippingAddress.email",   label: "Email",        placeholder: "john@example.com" },
    { name: "shippingAddress.phone",   label: "Phone",        placeholder: "+1 234 567 890" },
    { name: "shippingAddress.address", label: "Street",       placeholder: "123 Main St" },
    { name: "shippingAddress.city",    label: "City",         placeholder: "New York" },
  ].map(({ name, label, placeholder }) => (
    <FormField
      key={name}
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs text-slate-600">{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder={placeholder}
              className="bg-white dark:bg-zinc-900 border-emerald-200 rounded-lg"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ))}
</div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel className="text-purple-700 font-medium">Order Items</FormLabel>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append({ reference: "", name: "", price: 0, quantity: 1 })}
                  className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                >
                  <Plus size={14} className="mr-1" /> Add Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-3 rounded-lg border border-purple-100 bg-white dark:bg-zinc-900 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Item {index + 1}</span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Reference */}
                  <FormField control={form.control} name={`items.${index}.reference`} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-600">Product Reference</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. OVEN-001"
                          className="bg-slate-50 dark:bg-zinc-800 border-slate-200 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} /> <FormField control={form.control} name={`items.${index}.name`} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-600">Product Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. AIRPOT"
                          className="bg-slate-50 dark:bg-zinc-800 border-slate-200 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-3">
                    {/* Price */}
                    <FormField control={form.control} name={`items.${index}.price`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-600">Unit Price</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            className="bg-slate-50 dark:bg-zinc-800 border-slate-200 text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Quantity */}
                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-600">Quantity</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1}
                            placeholder="1"
                            className="bg-slate-50 dark:bg-zinc-800 border-slate-200 text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white hover:opacity-90 rounded-lg shadow-md"
            >
              {isLoading ? "Creating Order..." : "Create Order"}
            </Button>
          </form>
        </Form>
      </div>
    </SheetContent>
  );
};

export default CreateOrderForUser;