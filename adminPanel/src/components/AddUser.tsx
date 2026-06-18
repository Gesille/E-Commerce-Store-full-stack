"use client";

import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { User, Mail, Lock, Phone, MapPin, Shield } from "lucide-react";

import toast from "react-hot-toast";
import { useManagerRegisterUserMutation } from "@/redux/user/userApi";

const formSchema = z.object({
  name:     z.string().min(2, { message: "Name is required" }).max(50),
  email:    z.string().email({ message: "Valid email is required" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  phone:    z.string().optional(),
  address:  z.string().optional(),
  role:     z.enum(["user", "manager"]).default("user"),
});

type FormValues = z.infer<typeof formSchema>;
// comment
const AddUser = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name:    "",
      email:   "",
      password: "",
      phone:   "",
      address: "",
      role:    "user",
    },
  });

  const [managerRegisterUser, { isLoading }] = useManagerRegisterUserMutation();

  const onSubmit = async (data: FormValues) => {
    try {
      await managerRegisterUser(data).unwrap();
      toast.success("User created successfully!");
      form.reset();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to create user");
    }
  };

  return (
    <SheetContent className="w-[420px] sm:w-[500px] p-0 bg-gradient-to-b from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <SheetHeader className="p-6 bg-blue-50 border-b border-blue-100 text-slate-900">
        <SheetTitle className="text-xl font-semibold flex items-center gap-2 text-slate-800">
          <User size={18} /> Add User
        </SheetTitle>
        <p className="text-sm text-slate-500">
          Create a new user account directly from the dashboard
        </p>
      </SheetHeader>

      <div className="p-5 max-h-[calc(100vh-140px)] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Name */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-indigo-700">
                  <User size={14} /> Full Name
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. John Doe"
                    className="bg-white dark:bg-zinc-900 border-indigo-200 dark:border-zinc-700 rounded-lg"
                  />
                </FormControl>
                <FormDescription>Customer's full name</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* Email */}
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-blue-700">
                  <Mail size={14} /> Email Address
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="john@example.com"
                    className="bg-white dark:bg-zinc-900 border-blue-200 dark:border-zinc-700 rounded-lg"
                  />
                </FormControl>
                <FormDescription>Used for login and notifications</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* Password */}
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-purple-700">
                  <Lock size={14} /> Temporary Password
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="Min. 6 characters"
                    className="bg-white dark:bg-zinc-900 border-purple-200 dark:border-zinc-700 rounded-lg"
                  />
                </FormControl>
                <FormDescription>User will be asked to change this on first login</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* Phone */}
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-emerald-700">
                  <Phone size={14} /> Phone <span className="text-slate-400 font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="+1 234 567 890"
                    className="bg-white dark:bg-zinc-900 border-emerald-200 dark:border-zinc-700 rounded-lg"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Address */}
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-orange-700">
                  <MapPin size={14} /> Address <span className="text-slate-400 font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="123 Main St, New York"
                    className="bg-white dark:bg-zinc-900 border-orange-200 dark:border-zinc-700 rounded-lg"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Role */}
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-rose-700">
                  <Shield size={14} /> Role
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full h-10 px-3 rounded-lg border border-rose-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                  </select>
                </FormControl>
                <FormDescription>Assign the user's access level</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white hover:opacity-90 rounded-lg shadow-md"
            >
              {isLoading ? "Creating User..." : "Create User"}
            </Button>

          </form>
        </Form>
      </div>
    </SheetContent>
  );
};

export default AddUser;