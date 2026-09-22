"use client";

import { useState } from "react";

export default function InfoBulle({ texte }: { texte: string }) {
  const [ouverte, setOuverte] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOuverte((v) => !v)}
        aria-label="Plus d'informations"
        aria-expanded={ouverte}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-alt text-[10px] font-bold text-ink-muted transition-transform active:scale-90"
      >
        i
      </button>
      {ouverte && (
        <span
          role="tooltip"
          className="animate-fade-slide-in absolute left-1/2 top-[calc(100%+6px)] z-20 w-56 -translate-x-1/2 rounded-xl border border-border bg-surface p-2.5 text-[11px] leading-relaxed text-ink shadow-lg"
        >
          {texte}
        </span>
      )}
    </span>
  );
}
