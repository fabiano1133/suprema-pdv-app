"use client";

import { useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { formatUserInput, parseUserRole } from "@/lib/auth";

export function UserSelectModal() {
  const { user, mounted, setUser } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(formatUserInput(e.target.value));
    setErro(null);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setErro(null);
      const role = parseUserRole(inputValue);
      if (role) {
        setUser(role);
        setInputValue("");
      } else {
        setErro("Usuário inválido.");
      }
    },
    [inputValue, setUser]
  );

  if (!mounted || user !== null) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-select-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="user-select-title" className="text-center text-lg font-semibold text-slate-800">
          Usuário
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Digite o usuário para continuar.
        </p>
        <form onSubmit={handleSubmit} className="mt-6">
          <label htmlFor="user-input" className="block text-sm font-medium text-slate-700">
            Usuário
          </label>
          <input
            id="user-input"
            type="text"
            value={inputValue}
            onChange={handleChange}
            className="input-field mt-1 w-full uppercase"
            autoComplete="username"
            autoFocus
          />
          {erro && <p className="mt-2 text-sm text-red-600" role="alert">{erro}</p>}
          <button
            type="submit"
            className="btn-primary mt-4 w-full rounded-xl py-3 font-medium"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
