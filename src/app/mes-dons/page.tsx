import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { chargerMesDons } from "@/lib/mesDons";
import { compterMessagesNonLus } from "@/lib/messagerie";
import MesDonsClient from "./MesDonsClient";

export const dynamic = "force-dynamic";

export default async function MesDonsPage() {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) redirect("/connexion");

  const [dons, nonLusMessages] = await Promise.all([chargerMesDons(session.entrepriseId), compterMessagesNonLus(session)]);
  return <MesDonsClient dons={dons} nonLusMessages={nonLusMessages} />;
}
