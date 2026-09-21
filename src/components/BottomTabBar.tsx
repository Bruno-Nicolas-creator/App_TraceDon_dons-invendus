import Link from "next/link";

type Tab = "dons" | "archives" | "profil";

const TABS: { id: Tab; href: string; label: string }[] = [
  { id: "dons", href: "/dons", label: "Dons" },
  { id: "archives", href: "/archives", label: "Archives" },
  { id: "profil", href: "/profil", label: "Profil" },
];

function TabIcon({ id, active }: { id: Tab; active: boolean }) {
  const stroke = active ? "#2E6B4E" : "#6B6459";
  if (id === "dons") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3L4 9V21H20V9L12 3Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (id === "archives") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2" stroke={stroke} strokeWidth="1.8" />
        <path d="M4 10H20" stroke={stroke} strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke={stroke} strokeWidth="1.6" />
      <path d="M5 20C5 16.5 8 14.5 12 14.5C16 14.5 19 16.5 19 20" stroke={stroke} strokeWidth="1.6" />
    </svg>
  );
}

export default function BottomTabBar({ active }: { active: Tab }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="flex shrink-0 border-t border-border bg-surface px-2 pt-2.5 pb-3.5"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <TabIcon id={tab.id} active={isActive} />
            <span
              className={`text-[10px] ${isActive ? "font-semibold text-brand" : "text-ink-muted"}`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
