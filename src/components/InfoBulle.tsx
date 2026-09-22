"use client";

import { useState } from "react";

export default function InfoBulle({ texte }: { texte: string }) {
  const [ouverte, setOuverte] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOuverte(true)}
      onMouseLeave={() => setOuverte(false)}
    >
      <button
        type="button"
        onClick={() => setOuverte((v) => !v)}
        onFocus={() => setOuverte(true)}
        onBlur={() => setOuverte(false)}
        aria-label="Plus d'informations"
        aria-expanded={ouverte}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-ink-muted/50 bg-surface text-[10px] font-bold text-ink-muted transition-transform active:scale-90"
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
