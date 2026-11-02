export function AdminPageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-sm">
          {description}
        </p>
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </div>
  );
}
