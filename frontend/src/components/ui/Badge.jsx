const VARIANTS = {
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  blue: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  gray: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
};

export default function Badge({ variant = "gray", children }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
