import type { Metadata, Viewport } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jetonSiteAttendu, siteLockActif, SITE_PASSWORD_COOKIE } from "@/lib/sitePassword";
import BandeauMesureAudience from "@/components/BandeauMesureAudience";
import DevProfilSwitcher from "@/components/DevProfilSwitcher";
import SuiviNavigation from "@/components/SuiviNavigation";
import SiteLockScreen from "@/components/SiteLockScreen";
import { DroitsProvider } from "@/components/DroitsProvider";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TraceDon",
  description:
    "Traçabilité des dons d'invendus alimentaires et non alimentaires entre entreprises et associations.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#2e6b4e",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  if (siteLockActif()) {
    const magasinCookies = await cookies();
    const debloque = magasinCookies.get(SITE_PASSWORD_COOKIE)?.value === jetonSiteAttendu();
    if (!debloque) {
      return (
        <html lang="fr" className={`${fraunces.variable} ${publicSans.variable} h-full antialiased`}>
          <body className="min-h-full flex flex-col font-sans">
            <SiteLockScreen />
          </body>
        </html>
      );
    }
  }

  let cleActive: string | null = null;
  let comptes: { kind: "ENTREPRISE" | "ASSOCIATION" | "UTILISATEUR"; id: string; nom: string; role: string }[] = [];

  if (process.env.NODE_ENV !== "production") {
    const [session, entreprises, associations, coordinateurs] = await Promise.all([
      getSession(),
      prisma.entreprise.findMany({ select: { id: true, raisonSociale: true }, orderBy: { raisonSociale: "asc" } }),
      prisma.association.findMany({ select: { id: true, denomination: true }, orderBy: { denomination: "asc" } }),
      prisma.user.findMany({ where: { role: "COORDINATEUR" }, orderBy: { nom: "asc" } }),
    ]);

    if (session) {
      cleActive =
        session.role === "ENTREPRISE" && session.entrepriseId
          ? `ENTREPRISE:${session.entrepriseId}`
          : session.role === "ASSOCIATION" && session.associationId
            ? `ASSOCIATION:${session.associationId}`
            : `UTILISATEUR:${session.userId}`;
    }

    comptes = [
      ...entreprises.map((e) => ({ kind: "ENTREPRISE" as const, id: e.id, nom: e.raisonSociale, role: "ENTREPRISE" })),
      ...associations.map((a) => ({ kind: "ASSOCIATION" as const, id: a.id, nom: a.denomination, role: "ASSOCIATION" })),
      ...coordinateurs.map((u) => ({ kind: "UTILISATEUR" as const, id: u.id, nom: u.nom, role: "COORDINATEUR" })),
    ];
  }

  const sessionDroits = await getSession();

  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${publicSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <DroitsProvider niveau={sessionDroits?.niveau ?? null} coordinateur={sessionDroits?.role === "COORDINATEUR"}>
          {children}
        </DroitsProvider>
        <BandeauMesureAudience />
        <SuiviNavigation />
        {process.env.NODE_ENV !== "production" && <DevProfilSwitcher cleActive={cleActive} comptes={comptes} />}
      </body>
    </html>
  );
}
