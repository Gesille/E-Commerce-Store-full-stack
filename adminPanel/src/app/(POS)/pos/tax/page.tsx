"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  useGetTaxStatusQuery,
  useClearTaxCacheMutation,
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  useGetExemptCustomersQuery,
  useSetCustomerExemptionMutation,
  TaxHoliday,
} from "@/redux/tax/taxApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  CalendarDays,
  Plus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Search,
} from "lucide-react";

// ─── Status banner ─────────────────────────────────────────────────────────
function DiagnosticsBanner() {
  const { data, isLoading, refetch } = useGetTaxStatusQuery();
  const [clearCache, { isLoading: clearing }] = useClearTaxCacheMutation();

  const handleClear = async () => {
    try {
      await clearCache().unwrap();
      await refetch();
      toast.success("Tax cache cleared");
    } catch {
      toast.error("Failed to clear cache");
    }
  };

  if (isLoading) return <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />;
  if (!data) return null;

  const items = [
    { label: "ABCT Tax", v: data.odoo.abctTax },
    { label: "Tax Exempt Fiscal Position", v: data.odoo.taxExemptFiscalPosition },
    { label: "Tax Holiday Fiscal Position", v: data.odoo.taxHolidayFiscalPosition },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <ShieldCheck size={15} className="text-indigo-600" /> Odoo Tax Diagnostics
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={clearing}
          className="text-xs gap-1.5"
        >
          <RefreshCw size={12} className={clearing ? "animate-spin" : ""} />
          Clear cache
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <p className="text-[11px] text-slate-400">{it.label}</p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{it.v.status}</p>
          </div>
        ))}
      </div>

      {data.today.isHoliday && data.today.activeHoliday && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-medium">
          🎉 Tax holiday active today: {data.today.activeHoliday.label} (0% tax applied)
        </div>
      )}
    </div>
  );
}

// ─── Holiday form dialog ────────────────────────────────────────────────────
function HolidayDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: TaxHoliday | null;
}) {
  const [label, setLabel] = useState(editing?.label ?? "");
  const [startDate, setStartDate] = useState(
    editing ? editing.startDate.slice(0, 10) : "",
  );
  const [endDate, setEndDate] = useState(
    editing ? editing.endDate.slice(0, 10) : "",
  );

  const [createHoliday, { isLoading: creating }] = useCreateHolidayMutation();
  const [updateHoliday, { isLoading: updating }] = useUpdateHolidayMutation();
  const isLoading = creating || updating;

  const handleSave = async () => {
    if (!label.trim()) return toast.error("Label is required");
    if (!startDate || !endDate) return toast.error("Both dates are required");
    if (new Date(endDate) < new Date(startDate))
      return toast.error("End date must be after start date");

    try {
      if (editing) {
        await updateHoliday({ id: editing._id, label, startDate, endDate }).unwrap();
        toast.success("Holiday updated");
      } else {
        await createHoliday({ label, startDate, endDate }).unwrap();
        toast.success("Holiday created");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Failed to save holiday");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays size={16} className="text-indigo-600" />
            {editing ? "Edit Tax Holiday" : "New Tax Holiday"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Label *</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Back to School 2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Date *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useGetCustomersQuery } from "@/redux/pos/Posapi";

function AddExemptionSection() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useGetCustomersQuery(search, { skip: search.length < 2 });
  const [setExemption, { isLoading: saving }] = useSetCustomerExemptionMutation();

  const customers = data?.customers ?? [];

  const handleToggle = async (id: number, name: string, current: boolean) => {
    try {
      await setExemption({ odooPartnerId: id, exempt: !current }).unwrap();
      toast.success(current ? `Removed exemption for ${name}` : `${name} is now tax exempt`);
    } catch {
      toast.error("Failed to update exemption");
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Plus size={15} className="text-indigo-600" /> Add / Remove Exemption
        </h3>
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2.5 h-8">
          <Search size={12} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer by name…"
            className="bg-transparent border-none outline-none text-xs w-48"
          />
        </div>
      </div>

      <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
        {search.length < 2 && (
          <div className="px-4 py-6 text-sm text-slate-400 text-center">
            Type at least 2 characters to search
          </div>
        )}
        {isLoading && (
          <div className="px-4 py-6 text-sm text-slate-400 text-center">Searching…</div>
        )}
        {!isLoading && search.length >= 2 && customers.length === 0 && (
          <div className="px-4 py-6 text-sm text-slate-400 text-center">No customers found</div>
        )}
        {customers.map((c: any) => (
          <div
            key={c.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                {c.name}
                {c.isTaxExempt && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    EXEMPT
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400">
                {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact info"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => handleToggle(c.id, c.name, !!c.isTaxExempt)}
              className={c.isTaxExempt
                ? "text-xs text-red-500 border-red-200 hover:bg-red-50"
                : "text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"}
            >
              {c.isTaxExempt ? "Remove exemption" : "Grant exemption"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
// ─── Holidays list ───────────────────────────────────────────────────────────
function HolidaysSection() {
  const { data: holidays = [], isLoading } = useGetHolidaysQuery();
  const [updateHoliday] = useUpdateHolidayMutation();
  const [deleteHoliday] = useDeleteHolidayMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaxHoliday | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (h: TaxHoliday) => {
    setEditing(h);
    setDialogOpen(true);
  };

  const toggleActive = async (h: TaxHoliday) => {
    try {
      await updateHoliday({ id: h._id, active: !h.active }).unwrap();
      toast.success(h.active ? "Holiday deactivated" : "Holiday activated");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tax holiday?")) return;
    try {
      await deleteHoliday(id).unwrap();
      toast.success("Holiday deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <CalendarDays size={15} className="text-indigo-600" /> Tax Holidays
        </h3>
        <Button size="sm" onClick={openCreate} className="text-xs gap-1.5">
          <Plus size={13} /> Add Holiday
        </Button>
      </div>

      <div className="divide-y divide-slate-50">
        {isLoading && (
          <div className="px-4 py-6 text-sm text-slate-400 text-center">Loading…</div>
        )}
        {!isLoading && holidays.length === 0 && (
          <div className="px-4 py-6 text-sm text-slate-400 text-center">
            No tax holidays configured
          </div>
        )}
        {holidays.map((h) => {
          const start = new Date(h.startDate);
          const end = new Date(h.endDate);
          const isCurrentlyActive = h.active && start <= today && end >= today;
          return (
            <div
              key={h._id}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{h.label}</p>
                  {isCurrentlyActive && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      ACTIVE NOW
                    </span>
                  )}
                  {!h.active && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      DISABLED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {start.toLocaleDateString()} → {end.toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(h)}
                  className="text-xs text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
                >
                  {h.active ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => openEdit(h)}
                  className="text-xs text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(h._id)}
                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <HolidayDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
      />
    </div>
  );
}

// ─── Exempt customers ────────────────────────────────────────────────────────
function ExemptCustomersSection() {
  const { data: customers = [], isLoading } = useGetExemptCustomersQuery();
  const [setExemption] = useSetCustomerExemptionMutation();
  const [search, setSearch] = useState("");

  // Note: this endpoint only returns customers already marked exempt.
  // For adding NEW exemptions you'll want a customer search + toggle —
  // wiring that needs a generic "search all customers" endpoint
  // (your CustomerModal's useGetCustomersQuery works for this).

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleRemove = async (id: number, name: string) => {
    if (!confirm(`Remove tax exemption for ${name}?`)) return;
    try {
      await setExemption({ odooPartnerId: id, exempt: false }).unwrap();
      toast.success("Exemption removed");
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <ShieldOff size={15} className="text-indigo-600" /> Tax-Exempt Customers
        </h3>
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2.5 h-8">
          <Search size={12} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter…"
            className="bg-transparent border-none outline-none text-xs w-32"
          />
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {isLoading && (
          <div className="px-4 py-6 text-sm text-slate-400 text-center">Loading…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="px-4 py-6 text-sm text-slate-400 text-center">
            No exempt customers found
          </div>
        )}
        {filtered.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-slate-800">{c.name}</p>
              <p className="text-xs text-slate-400">
                {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact info"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRemove(c.id, c.name)}
              className="text-xs text-red-500 border-red-200 hover:bg-red-50"
            >
              Remove exemption
            </Button>
          </div>
        ))}
      </div>

      <p className="px-4 py-2.5 text-[11px] text-slate-400 border-t border-slate-50">
        To grant a new exemption, use the customer's profile or POS customer
        picker — search-and-toggle isn't wired here yet.
      </p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function TaxSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Tax Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage ABCT tax holidays and customer exemptions. These settings
          drive tax calculation directly on POS checkout.
        </p>
      </div>

      <DiagnosticsBanner />
      <HolidaysSection />
      <AddExemptionSection />
      <ExemptCustomersSection />
    </div>
  );
}