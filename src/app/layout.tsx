import type { Metadata, Viewport } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DevProfilSwitcher from "@/components/DevProfilSwitcher";
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
  title: "Dons invendus",
  description:
    "Traçabilité des dons d'invendus alimentaires et non alimentaires entre entreprises et associations.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#2e6b4e",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let emailActif: string | null = null;
  let comptes: { email: string; nom: string; role: string }[] = [];

  if (process.env.NODE_ENV !== "production") {
    const [session, utilisateurs] = await Promise.all([
      getSession(),
      prisma.user.findMany({
        include: { entreprise: { select: { raisonSociale: true } }, association: { select: { denomination: true } } },
        orderBy: { nom: "asc" },
      }),
    ]);

    if (session) {
      emailActif = utilisateurs.find((u) => u.id === session.userId)?.email ?? null;
    }

    comptes = utilisateurs.map((u) => ({
      email: u.email,
      nom: u.entreprise?.raisonSociale ?? u.association?.denomination ?? u.nom,
      role: u.role,
    }));
  }

  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${publicSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        {process.env.NODE_ENV !== "production" && <DevProfilSwitcher emailActif={emailActif} comptes={comptes} />}
      </body>
    </html>
  );
}
