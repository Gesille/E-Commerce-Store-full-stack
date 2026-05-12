"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, UserRole } from "@/redux/user/userApi";

// ── these callbacks are injected from the page so columns stay pure ──────────
export type ColumnCallbacks = {
  onRoleChange: (id: string, role: UserRole) => void;
  onDelete: (user: User) => void;
};

export const createColumns = ({
  onRoleChange,
  onDelete,
}: ColumnCallbacks): ColumnDef<User>[] => [
  // checkbox
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
  },

  // avatar + name
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 gap-1"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown size={13} />
      </Button>
    ),
    cell: ({ row }) => {
      const user = row.original;
      const avatarUrl = user.avatar?.url;
      const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      return (
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={user.name}
              width={32}
              height={32}
              className="rounded-full object-cover w-8 h-8"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-xs font-medium text-indigo-700 dark:text-indigo-300 shrink-0">
              {initials}
            </div>
          )}
          <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">
            {user.name}
          </span>
        </div>
      );
    },
  },

  // email
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 gap-1"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Email
        <ArrowUpDown size={13} />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400 text-sm">
        {row.original.email}
      </span>
    ),
  },

  // role — inline editable select
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <Select
          defaultValue={user.role}
          onValueChange={(val) => onRoleChange(user._id, val as UserRole)}
        >
          <SelectTrigger className="h-8 w-28 text-xs border-slate-200 dark:border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      );
    },
  },

  // verified badge
  {
    accessorKey: "isVerified",
    header: "Status",
    cell: ({ row }) => {
      const verified = row.original.isVerified;
      return verified ? (
        <Badge
          variant="outline"
          className="text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 text-xs"
        >
          Verified
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 text-xs"
        >
          Unverified
        </Badge>
      );
    },
  },

  // joined date
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => {
      const date = row.original.createdAt;
      if (!date) return <span className="text-slate-400 text-sm">—</span>;
      return (
        <span className="text-slate-500 dark:text-slate-400 text-sm">
          {new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      );
    },
  },

  // actions
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={() => onDelete(user)}
            title="Delete user"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      );
    },
  },
];
