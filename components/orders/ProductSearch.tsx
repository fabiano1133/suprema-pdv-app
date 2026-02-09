"use client";

import type { Product } from "@/lib/types";

interface ProductSearchProps {
  busca: string;
  setBusca: (v: string) => void;
  sugestoes: Product[];
  mostrarSugestoes: boolean;
  setMostrarSugestoes: (v: boolean) => void;
  onSelect: (produto: Product) => void;
  disabled?: boolean;
  erro?: string | null;
}

export function ProductSearch({
  busca,
  setBusca,
  sugestoes,
  mostrarSugestoes,
  setMostrarSugestoes,
  onSelect,
  disabled = false,
  erro,
}: ProductSearchProps) {
  return (
    <div className="relative">
      <label className="sr-only">Buscar produto (nome ou SKU)</label>
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        onFocus={() => setMostrarSugestoes(true)}
        onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
        placeholder="Buscar por nome ou SKU..."
        className="input-field text-lg"
        autoComplete="off"
        disabled={disabled}
      />
      {erro && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {erro}
        </p>
      )}
      {mostrarSugestoes && sugestoes.length > 0 && (
        <ul
          className={`absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg ${disabled ? "pointer-events-none opacity-60" : ""}`}
          role="listbox"
        >
          {sugestoes.map((produto) => (
            <li
              key={produto.id}
              role="option"
              className="flex cursor-pointer items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
              onClick={() => !disabled && onSelect(produto)}
            >
              <span className="font-medium text-slate-800">{produto.name}</span>
              <span className="text-sm text-slate-500">
                {produto.sku ?? "—"} · R$ {produto.price.toFixed(2)} · Est: {produto.quantity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
