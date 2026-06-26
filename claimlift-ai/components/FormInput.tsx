import type { ComponentProps } from "react";

interface FormInputProps extends ComponentProps<"input"> {
  label: string;
  hint?: string;
  options?: string[];
}

export default function FormInput({
  label,
  hint,
  id,
  options,
  className = "",
  required,
  ...rest
}: FormInputProps) {
  const inputId = id || rest.name;
  const inputClasses =
    "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/15";

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="ml-0.5 text-blue-600">*</span>}
      </label>
      {options ? (
        <select
          id={inputId}
          required={required}
          className={`${inputClasses} ${className}`}
          {...(rest as ComponentProps<"select">)}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          required={required}
          className={`${inputClasses} ${className}`}
          {...rest}
        />
      )}
      {hint && <p className="text-xs leading-relaxed text-slate-400">{hint}</p>}
    </div>
  );
}
