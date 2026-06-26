import type { ComponentProps } from "react";

interface TextAreaProps extends ComponentProps<"textarea"> {
  label: string;
  hint?: string;
}

export default function TextArea({
  label,
  hint,
  id,
  className = "",
  rows = 4,
  ...rest
}: TextAreaProps) {
  const inputId = id || rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        className={`w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 shadow-sm transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/15 ${className}`}
        {...rest}
      />
      {hint && <p className="text-xs leading-relaxed text-slate-400">{hint}</p>}
    </div>
  );
}
