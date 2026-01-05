export default function CanonBadge({
  label = "CANON",
}: {
  label?: string;
}) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
      {label}
    </span>
  );
}
