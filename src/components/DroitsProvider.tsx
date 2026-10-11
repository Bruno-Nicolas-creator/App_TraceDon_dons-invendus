"use client";

import { createContext, useContext } from "react";
import { niveauSuffisant, type NiveauAcces } from "@/lib/droits";

/**
 * Niveau d'accès de l'utilisateur connecté, mis à disposition de tous les écrans pour masquer les
 * boutons qu'il n'a pas le droit d'utiliser (décision B2 de Bruno). Ce n'est qu'un confort
 * d'affichage : le serveur revérifie le niveau à chaque action (src/lib/sessionLimitee.ts).
 */
const ContexteDroits = createContext<{ niveau: NiveauAcces | null; coordinateur: boolean }>({ niveau: null, coordinateur: false });

export function DroitsProvider({
  niveau,
  coordinateur,
  children,
}: {
  niveau: NiveauAcces | null;
  coordinateur: boolean;
  children: React.ReactNode;
}) {
  return <ContexteDroits.Provider value={{ niveau, coordinateur }}>{children}</ContexteDroits.Provider>;
}

export function useDroits() {
  const { niveau, coordinateur } = useContext(ContexteDroits);
  return {
    niveau,
    /** Peut agir sur les dons, les bons, les signatures de bons et la messagerie. */
    peutOperer: coordinateur || niveauSuffisant(niveau ?? undefined, "OPERATEUR"),
    /** Peut gérer l'organisation (informations, documents, utilisateurs, conventions, reçus…). */
    estAdministrateur: coordinateur || niveauSuffisant(niveau ?? undefined, "ADMINISTRATEUR"),
    lectureSeule: !coordinateur && niveau === "LECTURE",
  };
}
