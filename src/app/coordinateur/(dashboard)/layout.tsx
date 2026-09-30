import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CoordinateurShell from "./CoordinateurShell";

export default async function CoordinateurDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "COORDINATEUR") redirect("/connexion");

  return <CoordinateurShell nomCoordinateur={session.nom}>{children}</CoordinateurShell>;
}
