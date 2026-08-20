"use client";

export const PLACEMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "INFOBAR", label: "Barra superior" },
  { value: "FLOATING", label: "Botón flotante" },
  { value: "FOOTER", label: "Footer" },
  { value: "BOOKING", label: "Formulario de agenda" },
];

export function PlacementCheckboxes({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {PLACEMENT_OPTIONS.map((option) => (
        <label key={option.value} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={value.includes(option.value)}
            onChange={(e) => {
              const next = e.target.checked
                ? [...value, option.value]
                : value.filter((v) => v !== option.value);
              onChange(next);
            }}
            disabled={disabled}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
