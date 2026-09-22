import Link from "next/link";

type Tab = "dons" | "planning" | "archives" | "profil";
type Role = "ENTREPRISE" | "ASSOCIATION" | "COORDINATEUR";

function tabsForRole(role: Role): { id: Tab; href: string; label: string }[] {
  switch (role) {
    case "ENTREPRISE":
      return [
        { id: "dons", href: "/", label: "Nouveau don" },
        { id: "planning", href: "/planning", label: "Planning" },
        { id: "archives", href: "/archives", label: "Archives" },
        { id: "profil", href: "/profil", label: "Profil" },
      ];
    case "COORDINATEUR":
      return [
        { id: "dons", href: "/coordinateur", label: "Tableau de bord" },
        { id: "archives", href: "/archives", label: "Archives" },
        { id: "profil", href: "/profil", label: "Profil" },
      ];
    case "ASSOCIATION":
    default:
      return [
        { id: "dons", href: "/dons", label: "Dons" },
        { id: "archives", href: "/archives", label: "Archives" },
        { id: "profil", href: "/profil", label: "Profil" },
      ];
  }
}

function TabIcon({ id, active }: { id: Tab; active: boolean }) {
  const stroke = active ? "#2E6B4E" : "#6B6459";
  if (id === "dons") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3L4 9V21H20V9L12 3Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (id === "planning") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="2" stroke={stroke} strokeWidth="1.8" />
        <path d="M4 9.5H20M8 3V6.5M16 3V6.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
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

export default function BottomTabBar({ active, role }: { active: Tab; role: Role }) {
  const tabs = tabsForRole(role);
  return (
    <nav
      aria-label="Navigation principale"
      className="sticky bottom-0 z-10 flex shrink-0 border-t border-border bg-surface px-2 pt-2.5 pb-3.5"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link key={tab.id} href={tab.href} className="flex flex-1 flex-col items-center gap-1">
            <TabIcon id={tab.id} active={isActive} />
            <span className={`text-[10px] ${isActive ? "font-semibold text-brand" : "text-ink-muted"}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
