"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Users } from "lucide-react";
import toast from "react-hot-toast";

import {
  useGetAllUsersQuery,
  useUpdateUserRoleMutation,
  useDeleteUserMutation,
  type User,
  type UserRole,
} from "@/redux/user/userApi";

import { DataTable } from "./data-table";
import { createColumns } from "./columns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export default function UsersPage() {
  const { data: users = [], isLoading, isError, refetch } = useGetAllUsersQuery();
  const [updateUserRole] = useUpdateUserRoleMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // ── role change ────────────────────────────────────────────────────────────
  const handleRoleChange = async (id: string, role: UserRole) => {
    try {
      await updateUserRole({ id, role }).unwrap();
      toast.success("User role updated!");
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to update role");
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget?._id) return;
    try {
      await deleteUser(deleteTarget._id).unwrap();
      toast.success("User deleted successfully!");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to delete user");
    }
  };

  // ── bulk delete (from table row selection) ─────────────────────────────────
  const handleBulkDelete = async (selectedUsers: User[]) => {
    try {
      await Promise.all(selectedUsers.map((u) => deleteUser(u._id).unwrap()));
      toast.success(`${selectedUsers.length} user(s) deleted!`);
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to delete selected users");
    }
  };

  const columns = useMemo(
    () =>
      createColumns({
        onRoleChange: handleRoleChange,
        onDelete: setDeleteTarget,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* ── header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
            Users
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage accounts, roles, and access
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-1.5"
        >
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {/* ── count badge ── */}
      <Badge
        variant="secondary"
        className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
      >
        {isLoading ? "—" : users.length} users
      </Badge>

      {/* ── states ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Loading users...
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-red-500">Failed to load users.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <Users size={32} className="opacity-30" />
          <p className="text-sm">No users found.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          onBulkDelete={handleBulkDelete}
        />
      )}

      {/* ── delete confirm dialog ── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-[420px] bg-white dark:bg-zinc-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <AlertTriangle size={16} className="text-red-500" />
              Delete User
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {deleteTarget?.name}
            </span>{" "}
            ({deleteTarget?.email})? This action{" "}
            <span className="text-red-500 font-medium">cannot be undone</span>.
          </p>

          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
