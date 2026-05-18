"use client";

import {
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "./ui/button";
import { Mail, MapPin, Phone, Shield, User, Loader2 } from "lucide-react";
import { User as UserType, useUpdateUserRoleMutation } from "@/redux/user/userApi";
import toast from "react-hot-toast";


const formSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters" }).max(50),
  email: z.string().email({ message: "Invalid email address!" }),
  phone: z.string().min(10).max(15).optional().or(z.literal("")),
  address: z.string().min(2).optional().or(z.literal("")),
  city: z.string().min(2).optional().or(z.literal("")),
  role: z.enum(["admin", "user", "cashier"], { message: "Role must be admin, user, or cashier" }),
});

type FormValues = z.infer<typeof formSchema>;

type EditUserProps = {
  user: UserType;
};

const EditUser = ({ user }: EditUserProps) => {
  const [updateUserRole, { isLoading }] = useUpdateUserRoleMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: user.name || "",
      email: user.email || "",
      phone: "",
      address: "",
      city: "",
      role: user.role || "user",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      // If role changed, update via the role mutation
      if (data.role !== user.role) {
        await updateUserRole({ id: user._id, role: data.role }).unwrap();
      }
      // You can call updateUserInfo mutation here for name/phone/address if available
      toast.success("User updated successfully");
    } catch {
      toast.error("Failed to update user");
    }
  };

  return (
    <SheetContent className="w-[420px] sm:w-[500px] p-0 bg-gradient-to-b from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">

      {/* HEADER */}
      <SheetHeader className="p-6 bg-blue-50 border-b border-blue-100 text-slate-900 dark:bg-zinc-900 dark:border-zinc-800">
        <SheetTitle className="text-xl font-semibold flex items-center gap-2 text-slate-800 dark:text-white">
          <User size={18} />
          Edit User
        </SheetTitle>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Update <span className="font-medium text-indigo-600">{user.name}</span>'s information
        </p>
      </SheetHeader>

      {/* FORM */}
      <div className="p-5 max-h-[calc(100vh-140px)] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* PERSONAL */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                Personal Info
              </h2>

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                      <User size={14} /> Full Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter full name"
                        className="bg-white dark:bg-zinc-900 border-indigo-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500/40 rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                      <Mail size={14} /> Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter email"
                        className="bg-white dark:bg-zinc-900 border-indigo-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500/40 rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* CONTACT */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                Contact Info
              </h2>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <Phone size={14} /> Phone
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+1 (000) 000-0000"
                        className="bg-white dark:bg-zinc-900 border-emerald-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500/40 rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <MapPin size={14} /> Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Street address"
                        className="bg-white dark:bg-zinc-900 border-emerald-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500/40 rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <MapPin size={14} /> City
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="City"
                        className="bg-white dark:bg-zinc-900 border-emerald-200 dark:border-zinc-700 focus:ring-2 focus:ring-emerald-500/40 rounded-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ROLE */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-purple-600 uppercase tracking-wide">
                Permissions
              </h2>

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                      <Shield size={14} /> Role
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-zinc-900 border-purple-200 dark:border-zinc-700 focus:ring-2 focus:ring-purple-500/40 rounded-lg">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">👑 Admin</SelectItem>
                        <SelectItem value="user">👤 User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* SUBMIT */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white hover:opacity-90 rounded-lg shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>

          </form>
        </Form>
      </div>
    </SheetContent>
  );
};

export default EditUser;