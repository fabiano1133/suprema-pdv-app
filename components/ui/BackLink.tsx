import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackLinkProps {
  href: string;
  "aria-label"?: string;
}

export function BackLink({ href, "aria-label": ariaLabel = "Voltar" }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 flex items-center justify-center"
      aria-label={ariaLabel}
    >
      <ArrowLeft className="h-5 w-5" aria-hidden />
    </Link>
  );
}
