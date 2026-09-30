"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Tableau de bord", href: "/coordinateur" },
  { label: "Entreprises", href: "/coordinateur/entreprises" },
  { label: "Associations", href: "/coordinateur/associations" },
  { label: "Dons", href: "/coordinateur/dons" },
  { label: "Archives", href: "/archives" },
  { label: "Réseaux", href: "/coordinateur/reseaux" },
];

export default function CoordinateurShell({
  nomCoordinateur,
  children,
}: {
  nomCoordinateur: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-bg lg:flex-row">
      <aside className="hidden w-58 shrink-0 flex-col bg-brand-dark p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-brand-tint font-display text-sm font-bold text-brand-dark">D</div>
          <span className="font-display text-base font-semibold text-white">DonSolidaire</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const actif = item.href === "/coordinateur" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-lg px-3 py-2.5 text-[13.5px] transition-colors hover:bg-white/10 ${
                  actif ? "bg-white/10 font-semibold text-white" : "text-white/70"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1" />
        <Link href="/profil" className="flex items-center gap-2.5 border-t border-white/15 px-2 pt-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-bold text-brand-dark">
            {nomCoordinateur.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-white">{nomCoordinateur} — Coordinateur</div>
            <div className="text-[11px] text-white/60">Voir le profil</div>
          </div>
        </Link>
      </aside>

      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-brand-dark px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-tint font-display text-sm font-bold text-brand-dark">D</div>
            <span className="font-display text-sm font-semibold text-white">DonSolidaire</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMenuOuvert((v) => !v)}
              aria-label="Menu"
              aria-expanded={menuOuvert}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/80"
            >
              {menuOuvert ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            </button>
            <Link href="/profil" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-xs font-bold text-brand-dark">
              {nomCoordinateur.slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </div>

        {/* Le menu de navigation complet (Entreprises, Associations, Dons, Réseaux...) n'a pas
            d'équivalent visible sous le sidebar desktop tant que cet écran n'est pas déplié : sans
            lui, ces pages ne sont tout simplement pas atteignables sur mobile. */}
        {menuOuvert && (
          <nav className="border-b border-black/10 bg-brand-dark px-4 pb-3">
            <div className="flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => {
                const actif = item.href === "/coordinateur" ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOuvert(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      actif ? "bg-white/10 font-semibold text-white" : "text-white/70"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-16 shrink-0 items-center gap-4 border-b border-border px-8 lg:flex">
          <div className="flex max-w-90 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="#6B6459" strokeWidth="1.8" />
              <path d="M20 20L16.5 16.5" stroke="#6B6459" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] text-ink-muted">Rechercher une entreprise, association...</span>
          </div>
        </header>

        <main className="flex-1 space-y-5 overflow-y-auto px-4 py-5 lg:space-y-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
