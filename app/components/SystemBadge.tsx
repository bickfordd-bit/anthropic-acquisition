export default function SystemBadge({
  label = "System-Initiated Execution",
}: {
  label?: string;
}) {
  return (
    <span className="inline-flex items-center rounded-full border bg-white px-2 py-1 text-xs font-medium text-zinc-700">
      {label}
    </span>
  );
}
