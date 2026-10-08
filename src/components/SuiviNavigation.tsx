"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ajusterEnregistrement } from "@/lib/analytics";

// Décide de l'enregistrement d'écran une fois la nouvelle page réellement affichée : démarrer
// plus tôt (au début de la navigation) enregistrerait encore la page que l'on quitte.
export default function SuiviNavigation() {
  const chemin = usePathname();
  useEffect(() => {
    ajusterEnregistrement(chemin);
  }, [chemin]);
  return null;
}
