"use client";

import { useEffect, useState } from "react";
import { enregistrerAbonnementPushAction, retirerAbonnementPushAction } from "@/app/profil/actions";

type Etat = "verification" | "non-supporte" | "desactive" | "refuse" | "actif";

/**
 * Convertit la clé VAPID publique (base64 URL-safe) au format attendu par
 * PushManager.subscribe — copie standard, pas d'API navigateur équivalente.
 */
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const brute = atob(base64);
  return Uint8Array.from([...brute].map((c) => c.charCodeAt(0)));
}

export default function ActiverNotificationsPush({ vapidPublicKey }: { vapidPublicKey: string }) {
  // Toujours "verification" (donc rien n'est affiché) au premier rendu, y compris côté client :
  // les API navigateur ci-dessous n'existent pas côté serveur, les lire plus tôt (même derrière
  // un `typeof window`) donnerait un premier rendu client différent du HTML reçu du serveur.
  const [etat, setEtat] = useState<Etat>("verification");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- support détectable seulement après montage (API navigateur absente du rendu serveur)
      setEtat("non-supporte");
      return;
    }
    if (Notification.permission === "denied") {
      setEtat("refuse");
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const abonnement = await registration.pushManager.getSubscription();
      setEtat(abonnement ? "actif" : "desactive");
    });
  }, []);

  const activer = async () => {
    setErreur(null);
    setEnCours(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEtat("refuse");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const abonnement = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
      const json = abonnement.toJSON();
      await enregistrerAbonnementPushAction({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      setEtat("actif");
    } catch {
      setErreur("Impossible d'activer les notifications sur cet appareil.");
    } finally {
      setEnCours(false);
    }
  };

  const desactiver = async () => {
    setErreur(null);
    setEnCours(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const abonnement = await registration.pushManager.getSubscription();
      if (abonnement) {
        await retirerAbonnementPushAction(abonnement.endpoint);
        await abonnement.unsubscribe();
      }
      setEtat("desactive");
    } catch {
      setErreur("Impossible de désactiver les notifications sur cet appareil.");
    } finally {
      setEnCours(false);
    }
  };

  if (etat === "verification") return null;

  return (
    <div className="animate-fade-slide-in space-y-2.5 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-semibold">Notifications sur cet appareil</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
          {etat === "non-supporte" &&
            "Ce navigateur ne prend pas en charge les notifications. Sur iPhone, ajoutez d'abord ce site à l'écran d'accueil (bouton Partager → Sur l'écran d'accueil), puis réessayez depuis l'application ajoutée."}
          {etat === "refuse" &&
            "Les notifications ont été refusées pour ce site. Autorisez-les dans les réglages de votre navigateur pour les activer."}
          {etat === "desactive" && "Recevez une alerte dès qu'une action vous concerne, sans avoir à rouvrir l'application."}
          {etat === "actif" && "Activées sur cet appareil."}
        </p>
      </div>
      {erreur && <div className="rounded-lg bg-accent-tint px-3 py-2 text-xs text-accent">{erreur}</div>}
      {etat === "desactive" && (
        <button
          type="button"
          onClick={activer}
          disabled={enCours}
          className="w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enCours ? "Activation…" : "Activer les notifications"}
        </button>
      )}
      {etat === "actif" && (
        <button
          type="button"
          onClick={desactiver}
          disabled={enCours}
          className="w-full rounded-full border border-border py-2.5 text-sm font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enCours ? "Désactivation…" : "Désactiver sur cet appareil"}
        </button>
      )}
    </div>
  );
}
