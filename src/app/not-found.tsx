import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-alt">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="#6B6459" strokeWidth="1.8" />
          <path d="M20 20L16.5 16.5" stroke="#6B6459" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <h1 className="mb-1 text-lg font-semibold">Page introuvable</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          Cette page n&apos;existe pas, ou vous n&apos;y avez pas accès.
        </p>
      </div>
      <Link
        href="/"
        className="w-full rounded-full bg-brand py-3 text-center text-sm font-bold text-white transition-transform active:scale-95"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
