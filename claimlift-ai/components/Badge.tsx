import type { ReactNode } from "react";

export type BadgeTone =
  | "blue"
  | "indigo"
  | "green"
  | "amber"
  | "red"
  | "slate";

const tones: Record<BadgeTone, string> = {
  blue: "bg-blue-50/80 text-blue-700 ring-blue-200/70",
  indigo: "bg-indigo-50/80 text-indigo-700 ring-indigo-200/70",
  green: "bg-emerald-50/80 text-emerald-700 ring-emerald-200/70",
  amber: "bg-amber-50/80 text-amber-700 ring-amber-200/70",
  red: "bg-red-50/80 text-red-700 ring-red-200/70",
  slate: "bg-slate-100 text-slate-600 ring-slate-200/80",
};

const dotColors: Record<BadgeTone, string> = {
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  slate: "bg-slate-400",
};

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export default function Badge({
  tone = "slate",
  dot = false,
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tones[tone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[tone]}`} />}
      {children}
    </span>
  );
}
