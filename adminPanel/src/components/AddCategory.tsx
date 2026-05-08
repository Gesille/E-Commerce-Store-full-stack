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
import { Tag, FileText } from "lucide-react";
import { useCreateCategoryMutation } from "@/redux/category/categoryApi";
import toast from "react-hot-toast";

const formSchema = z.object({
  catTitle: z.string().min(2, { message: "Category name is required" }).max(50),
  catDesc: z.string().min(1, { message: "Description is required" }),
});

type FormValues = z.infer<typeof formSchema>;

const AddCategory = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      catTitle: "",
      catDesc: "",
    },
  });

  const [createCategory, { isLoading }] = useCreateCategoryMutation();

  const onSubmit = async (data: FormValues) => {
    try {
      await createCategory({
        catTitle: data.catTitle,
        catDesc: data.catDesc,
      }).unwrap();

      toast.success("Category created successfully!");
      form.reset();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to create category");
    }
  };

  return (
    <SheetContent className="w-[420px] sm:w-[500px] p-0 bg-gradient-to-b from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <SheetHeader className="p-6 bg-blue-50 border-b border-blue-100 text-slate-900">
        <SheetTitle className="text-xl font-semibold flex items-center gap-2 text-slate-800">
          <Tag size={18} /> Add Category
        </SheetTitle>
        <p className="text-sm text-slate-500">
          Create a new product category for equipment
        </p>
      </SheetHeader>

      <div className="p-5 max-h-[calc(100vh-140px)] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            <FormField control={form.control} name="catTitle" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-indigo-700">
                  <Tag size={14} /> Category Name
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. Ovens, Grills, Fryers"
                    className="bg-white dark:bg-zinc-900 border-indigo-200 dark:border-zinc-700 rounded-lg"
                  />
                </FormControl>
                <FormDescription>Enter a category name</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="catDesc" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-emerald-700">
                  <FileText size={14} /> Description
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Describe this category..."
                    className="bg-white dark:bg-zinc-900 border-emerald-200 dark:border-zinc-700 rounded-lg"
                  />
                </FormControl>
                <FormDescription>Brief description of this category</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white hover:opacity-90 rounded-lg shadow-md"
            >
              {isLoading ? "Creating..." : "Create Category"}
            </Button>
          </form>
        </Form>
      </div>
    </SheetContent>
  );
};

export default AddCategory;