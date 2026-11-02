export function SectionHeader({
  eyebrow,
  title,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h2>
      </div>
      {trailing}
    </div>
  );
}
