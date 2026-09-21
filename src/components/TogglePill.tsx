"use client";

export default function TogglePill<T extends string>({
  options,
  valeur,
  onChange,
}: {
  options: { valeur: T; label: string }[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.valeur === valeur)
  );
  const n = options.length;

  return (
    <div className="relative flex rounded-xl bg-surface-alt p-1">
      <div
        className="absolute top-1 bottom-1 left-1 rounded-lg bg-brand transition-transform duration-300 ease-out"
        style={{ width: `calc(${100 / n}% - ${8 / n}px)`, transform: `translateX(${index * 100}%)` }}
        aria-hidden="true"
      />
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          onClick={() => onChange(o.valeur)}
          className={`relative z-10 flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors duration-300 active:scale-95 ${
            valeur === o.valeur ? "text-white" : "text-ink-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
