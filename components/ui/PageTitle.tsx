interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTitle({ children, className = "" }: PageTitleProps) {
  return (
    <h1 className={`text-xl font-semibold text-slate-800 ${className}`}>
      {children}
    </h1>
  );
}
