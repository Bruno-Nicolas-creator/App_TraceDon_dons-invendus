"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-tint">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 9V13.5" stroke="#C1622E" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.3" r="1" fill="#C1622E" />
          <circle cx="12" cy="12" r="9" stroke="#C1622E" strokeWidth="1.8" />
        </svg>
      </div>
      <div>
        <h1 className="mb-1 text-lg font-semibold">Une erreur est survenue</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          Quelque chose s&apos;est mal passé de notre côté. Vous pouvez réessayer, ou revenir à l&apos;accueil.
        </p>
      </div>
      <div className="flex w-full gap-2.5">
        <button
          type="button"
          onClick={() => reset()}
          className="flex-1 rounded-full border border-border bg-surface py-3 text-sm font-semibold transition-transform active:scale-95"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="flex-1 rounded-full bg-brand py-3 text-center text-sm font-bold text-white transition-transform active:scale-95"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
