import "server-only";
import { getSession } from "@/lib/auth";
import { tropDActions } from "@/lib/rateLimiter";

// Session de l'utilisateur pour une action serveur, avec le plafond général de fréquence appliqué :
// les fichiers d'actions l'importent à la place de getSession pour que toute action soit limitée.
export async function getSessionLimitee() {
  const session = await getSession();
  if (session && (await tropDActions(session.userId))) {
    throw new Error("Trop d'actions en peu de temps, merci de réessayer dans quelques minutes.");
  }
  return session;
}
