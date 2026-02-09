import Link from "next/link";
import { Plus } from "lucide-react";

interface FABProps {
  href: string;
  "aria-label": string;
  children?: React.ReactNode;
}

export function FAB({ href, "aria-label": ariaLabel, children }: FABProps) {
  return (
    <Link
      href={href}
      className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 active:scale-95"
      aria-label={ariaLabel}
    >
      {children ?? <Plus className="h-7 w-7" aria-hidden />}
    </Link>
  );
}
