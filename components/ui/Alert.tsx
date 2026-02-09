"use client";

import { AlertCircle, CheckCircle } from "lucide-react";

interface AlertProps {
  message: string;
  onRetry?: () => void;
  variant?: "error" | "success";
}

export function Alert({ message, onRetry, variant = "error" }: AlertProps) {
  const isError = variant === "error";
  const Icon = isError ? AlertCircle : CheckCircle;
  return (
    <div
      className={`rounded-xl border p-4 text-sm flex items-start gap-3 ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
      role={isError ? "alert" : "status"}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
      <span className="flex-1">
        {message}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-2 font-medium underline"
          >
            Tentar novamente
          </button>
        )}
      </span>
    </div>
  );
}
