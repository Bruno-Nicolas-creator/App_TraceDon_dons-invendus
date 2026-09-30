import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function CoordinateurLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "COORDINATEUR") redirect("/connexion");

  return children;
}
