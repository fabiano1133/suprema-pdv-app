import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Carregando…" }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
      {message}
    </div>
  );
}
