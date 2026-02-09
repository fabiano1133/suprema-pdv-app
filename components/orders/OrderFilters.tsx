"use client";

import { Filter, Calendar } from "lucide-react";
import type { OrderStatusFilter } from "@/lib/types";

const STATUS_OPCOES: { value: OrderStatusFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "OPEN", label: "Aberta" },
  { value: "PAID", label: "Paga" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "REFUNDED", label: "Reembolsada" },
];

interface OrderFiltersProps {
  statusFilter: OrderStatusFilter;
  setStatusFilter: (v: OrderStatusFilter) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
}

export function OrderFilters({
  statusFilter,
  setStatusFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: OrderFiltersProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
        <Filter className="h-4 w-4" aria-hidden />
        Filtros
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Status</label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPCOES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === value
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 sm:gap-3">
          <div>
            <label htmlFor="startDate" className="mb-1 flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              Data inicial
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="mb-1 flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              Data final
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field py-1.5 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
