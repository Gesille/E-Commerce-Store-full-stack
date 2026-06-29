"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SupplierOption {
  id: number;
  name: string;
  ref?: string;
}

interface Props {
  suppliers: SupplierOption[];
  value: number | null;
  onChange: (supplierId: number) => void;
  placeholder?: string;
}

export const SupplierCombobox = ({
  suppliers,
  value,
  onChange,
  placeholder = "Select supplier",
}: Props) => {
  const [open, setOpen] = useState(false);
  const selected = suppliers.find((s) => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white border-indigo-200 text-sm font-normal h-9"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 size={14} className="text-slate-400 shrink-0" />
            {selected ? (
              <span className="truncate">
                {selected.name}
                {selected.ref && (
                  <span className="ml-1.5 text-xs text-slate-400">({selected.ref})</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command
          filter={(value, search) => {
            // value here is the CommandItem's `value` prop (name|ref)
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Search by name or ref (e.g. inv_123)..." />
          <CommandList>
            <CommandEmpty>No supplier found.</CommandEmpty>
            <CommandGroup>
              {suppliers.map((s) => (
                <CommandItem
                  key={s.id}
                  // Include ref in the searchable value so Command filter picks it up
                  value={`${s.name}|${s.ref ?? ""}`}
                  onSelect={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value === s.id ? "opacity-100 text-indigo-600" : "opacity-0"
                      )}
                    />
                    <span className="font-medium text-slate-700">{s.name}</span>
                  </div>
                  {s.ref && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                      {s.ref}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};