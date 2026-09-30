import "server-only";
import webPush from "web-push";
import { prisma } from "@/lib/prisma";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails("mailto:contact@dons-invendus.vercel.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export function isPushConfigure(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

/**
 * Envoie une notification push à tous les appareils d'une liste d'utilisateurs. N'échoue jamais
 * bruyamment (même logique que envoyerEmail) : un abonnement expiré est simplement supprimé.
 */
export async function envoyerPush(userIds: string[], titre: string, corps: string, url: string = "/"): Promise<void> {
  if (!isPushConfigure() || userIds.length === 0) return;

  const abonnements = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  await Promise.all(
    abonnements.map(async (abonnement) => {
      try {
        await webPush.sendNotification(
          { endpoint: abonnement.endpoint, keys: { p256dh: abonnement.p256dh, auth: abonnement.auth } },
          JSON.stringify({ titre, corps, url })
        );
      } catch (e) {
        const statusCode = (e as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Abonnement expiré ou révoqué côté navigateur : on nettoie plutôt que de réessayer.
          await prisma.pushSubscription.delete({ where: { id: abonnement.id } }).catch(() => {});
        } else {
          console.error("Échec d'envoi d'une notification push :", e);
        }
      }
    })
  );
}
