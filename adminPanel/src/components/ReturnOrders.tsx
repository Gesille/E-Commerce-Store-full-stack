"use client";

import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import { RotateCcw, Hash, Tag, FileText, CreditCard } from "lucide-react";
import { useReturnOrderMutation } from "@/redux/order/orderApi";
import toast from "react-hot-toast";

const formSchema = z.object({
  orderId: z.string().min(1, { message: "Order ID is required" }),
  productName: z.string().min(1, { message: "Product name is required" }),
  quantity: z.coerce.number({ message: "Must be a number" }).int().min(1, { message: "Quantity must be at least 1" }),
  paymentMethod: z.enum(["cash", "card", "check"], {
    error: "Refund method is required",
  }),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ReturnOrder = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      orderId: "",
      productName: "",
      quantity: 0,
      paymentMethod: "cash",
      reason: "",
    },
  });

  const [returnOrder, { isLoading }] = useReturnOrderMutation();

  const onSubmit = async (data: FormValues) => {
    try {
      await returnOrder({
        orderId: data.orderId,
        paymentMethod: data.paymentMethod,
        itemsToReturn: [
          {
            productName: data.productName,
            quantity: data.quantity,
          },
        ],
      }).unwrap();

      toast.success("Return processed successfully!");
      form.reset();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to process return");
    }
  };

  return (
    <SheetContent className="w-[420px] sm:w-[500px] p-0 bg-gradient-to-b from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <SheetHeader className="p-6 bg-blue-50 border-b border-blue-100 text-slate-900">
        <SheetTitle className="text-xl font-semibold flex items-center gap-2 text-slate-800">
          <RotateCcw size={18} /> Return Order Items
        </SheetTitle>
        <p className="text-sm text-slate-500">
          Submit items to return from a delivered order
        </p>
      </SheetHeader>

      <div className="p-5 max-h-[calc(100vh-140px)] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Order ID */}
            <FormField control={form.control} name="orderId" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-indigo-700">
                  <Hash size={14} /> Order ID
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. 64f3c2a1b..."
                    className="bg-white dark:bg-zinc-900 border-indigo-200 dark:border-zinc-700 rounded-lg"
                  />
                </FormControl>
                <FormDescription>MongoDB order ID to return</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* Product Name */}
            <FormField control={form.control} name="productName" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-indigo-700">
                  <Tag size={14} /> Product Name
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. Commercial Oven"
                    className="bg-white dark:bg-zinc-900 border-indigo-200 dark:border-zinc-700 rounded-lg"
                  />
                </FormControl>
                <FormDescription>Name of the product to return</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* Quantity */}
            <FormField control={form.control} name="quantity" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-indigo-700">
                  <Hash size={14} /> Quantity
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    placeholder="Number of units to return"
                    className="bg-white dark:bg-zinc-900 border-indigo-200 dark:border-zinc-700 rounded-lg"
                  />
                </FormControl>
                <FormDescription>How many units to return</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* Payment Method (refund method) */}
            <FormField control={form.control} name="paymentMethod" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-indigo-700">
                  <CreditCard size={14} /> Refund Method
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white dark:bg-zinc-900 border-indigo-200 dark:border-zinc-700 rounded-lg">
                      <SelectValue placeholder="Select refund method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  How the customer should be refunded (can differ from original payment method)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* Reason (optional) */}
            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-emerald-700">
                  <FileText size={14} /> Reason <span className="text-slate-400 font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Describe reason for return..."
                    className="bg-white dark:bg-zinc-900 border-emerald-200 dark:border-zinc-700 rounded-lg"
                  />
                </FormControl>
                <FormDescription>Brief reason for the return</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white hover:opacity-90 rounded-lg shadow-md"
            >
              {isLoading ? "Processing..." : "Submit Return"}
            </Button>
          </form>
        </Form>
      </div>
    </SheetContent>
  );
};

export default ReturnOrder;