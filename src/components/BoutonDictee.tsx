"use client";

export default function BoutonDictee({
  disponible,
  enCours,
  onClick,
}: {
  disponible: boolean;
  enCours: boolean;
  onClick: () => void;
}) {
  if (!disponible) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-transform active:scale-95 ${
        enCours ? "bg-accent text-white" : "bg-surface-alt text-ink-muted"
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {enCours ? "Écoute…" : "Dicter"}
    </button>
  );
}
