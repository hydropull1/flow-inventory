interface CheckboxGroupProps {
  label?: string;
  hint?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function CheckboxGroup({
  label,
  hint,
  options,
  selected,
  onChange,
}: CheckboxGroupProps) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((o) => o !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <fieldset className="flex flex-col gap-2">
      {label && (
        <legend className="text-sm font-medium text-slate-700">{label}</legend>
      )}
      {hint && <p className="-mt-1 text-xs text-slate-400">{hint}</p>}
      <div className="mt-1 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {options.map((option) => {
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium transition-all duration-150 ${
                checked
                  ? "border-blue-600 bg-blue-50 text-blue-800 shadow-sm ring-1 ring-blue-600/20"
                  : "border-slate-300 bg-white text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-600/30"
              />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
