const STYLES: Record<string, string> = {
  placed: "bg-amber-100 text-amber-900",
  confirmed: "bg-sky-100 text-sky-900",
  shipped: "bg-indigo-100 text-indigo-900",
  delivered: "bg-sage text-forest",
  booked: "bg-sky-100 text-sky-900",
  completed: "bg-sage text-forest",
  cancelled: "bg-stone-200 text-stone-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STYLES[status] ?? "bg-stone-100"}`}>
      {status}
    </span>
  );
}
