import Link from "next/link";

type Tab = "dons" | "planning" | "messages" | "archives" | "profil";
type Role = "ENTREPRISE" | "ASSOCIATION" | "COORDINATEUR";

function tabsForRole(role: Role): { id: Tab; href: string; label: string }[] {
  switch (role) {
    case "ENTREPRISE":
      return [
        { id: "dons", href: "/", label: "Nouveau don" },
        { id: "planning", href: "/planning", label: "Planning" },
        { id: "messages", href: "/messages", label: "Messages" },
        { id: "archives", href: "/archives", label: "Archives" },
        { id: "profil", href: "/profil", label: "Profil" },
      ];
    case "COORDINATEUR":
      return [
        { id: "dons", href: "/coordinateur", label: "Tableau de bord" },
        { id: "messages", href: "/messages", label: "Messages" },
        { id: "archives", href: "/archives", label: "Archives" },
        { id: "profil", href: "/profil", label: "Profil" },
      ];
    case "ASSOCIATION":
    default:
      return [
        { id: "dons", href: "/dons", label: "Dons" },
        { id: "messages", href: "/messages", label: "Messages" },
        { id: "archives", href: "/archives", label: "Archives" },
        { id: "profil", href: "/profil", label: "Profil" },
      ];
  }
}

const EMOJI_PAR_ONGLET: Record<Tab, string> = {
  dons: "🧺",
  planning: "📅",
  messages: "💬",
  archives: "🗂️",
  profil: "👤",
};

const FOND_PAR_ONGLET: Record<Tab, string> = {
  dons: "#E9F6E4",
  planning: "#E3F0FA",
  messages: "#EEE9FA",
  archives: "#FBEEDA",
  profil: "#FBE0DA",
};

function TabIcon({ id, active }: { id: Tab; active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 items-center justify-center rounded-full text-base leading-none transition-opacity ${active ? "opacity-100" : "opacity-45 grayscale"}`}
      style={{ backgroundColor: FOND_PAR_ONGLET[id] }}
    >
      {EMOJI_PAR_ONGLET[id]}
    </span>
  );
}

export default function BottomTabBar({
  active,
  role,
  nonLusMessages = 0,
}: {
  active: Tab;
  role: Role;
  nonLusMessages?: number;
}) {
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
            <span className="relative">
              <TabIcon id={tab.id} active={isActive} />
              {tab.id === "messages" && nonLusMessages > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                  {nonLusMessages > 99 ? "99+" : nonLusMessages}
                </span>
              )}
            </span>
            <span className={`text-[10px] ${isActive ? "font-semibold text-brand" : "text-ink-muted"}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
