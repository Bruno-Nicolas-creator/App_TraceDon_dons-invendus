"use client";

import { useEffect, useRef } from "react";

type Marqueur = { id: string; lat: number; lng: number; label: string };

declare global {
  interface Window {
    google?: typeof google;
  }
}

let scriptPromise: Promise<void> | null = null;

function chargerScriptGoogleMaps(cle: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${cle}`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Échec du chargement de Google Maps"));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

const DUREE_ANIMATION_SELECTION_MS = 1400;

export default function GoogleMap({
  center,
  marqueurs,
  marqueurActifId = null,
  marqueurActifSeq = 0,
}: {
  center: { lat: number; lng: number };
  marqueurs: Marqueur[];
  marqueurActifId?: string | null;
  /** Incrémenté à chaque clic, même sur la même carte, pour rejouer l'animation à chaque fois. */
  marqueurActifSeq?: number;
}) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const minuteriesRef = useRef<number[]>([]);
  const marqueursGoogleRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const arretAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    const cle = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!cle || !conteneurRef.current) return;
    let annule = false;
    // Capturé une fois : le Map lui-même est muté en place (jamais réassigné à `.current`), donc
    // cette référence reste valide dans le callback asynchrone et le nettoyage ci-dessous.
    const marqueursMap = marqueursGoogleRef.current;

    chargerScriptGoogleMaps(cle).then(() => {
      if (annule || !conteneurRef.current || !window.google) return;
      const { google } = window;

      const carte = new google.maps.Map(conteneurRef.current, {
        center,
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true,
      });

      new google.maps.Marker({
        position: center,
        map: carte,
        title: "Votre association",
        animation: google.maps.Animation.DROP,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#2E6B4E",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });

      // Pas de label texte sur les repères : avec plusieurs entreprises/associations proches,
      // les noms se chevauchent et rendent la carte illisible. Le nom reste disponible via la
      // carte de la liste ; cliquer dessus anime le bon repère pour le repérer sur la carte.
      // On retire d'abord les repères d'un éventuel rendu précédent (changement de `marqueurs`) :
      // sans ça, ils restent visibles sur la carte en plus des nouveaux.
      marqueursMap.forEach((marqueur) => marqueur.setMap(null));
      marqueursMap.clear();
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(center);
      marqueurs.forEach((m, i) => {
        const position = { lat: m.lat, lng: m.lng };
        const marqueur = new google.maps.Marker({ title: m.label });
        marqueursMap.set(m.id, marqueur);
        bounds.extend(position);
        minuteriesRef.current.push(
          window.setTimeout(() => {
            marqueur.setPosition(position);
            marqueur.setMap(carte);
            marqueur.setAnimation(google.maps.Animation.DROP);
          }, 120 + i * 90)
        );
      });
      const ajusterCarte = () => {
        google.maps.event.trigger(carte, "resize");
        if (marqueurs.length > 0) carte.fitBounds(bounds, 60);
        else carte.setCenter(center);
      };
      ajusterCarte();

      const observateur = new ResizeObserver(ajusterCarte);
      if (conteneurRef.current) observateur.observe(conteneurRef.current);
      resizeObserverRef.current = observateur;
    });

    return () => {
      annule = true;
      resizeObserverRef.current?.disconnect();
      minuteriesRef.current.forEach((id) => window.clearTimeout(id));
      minuteriesRef.current = [];
      marqueursMap.forEach((marqueur) => marqueur.setMap(null));
      marqueursMap.clear();
    };
  }, [center, marqueurs]);

  useEffect(() => {
    if (arretAnimationRef.current) {
      window.clearTimeout(arretAnimationRef.current);
      arretAnimationRef.current = null;
    }
    marqueursGoogleRef.current.forEach((marqueur) => marqueur.setAnimation(null));
    if (!marqueurActifId || !window.google) return;

    const marqueur = marqueursGoogleRef.current.get(marqueurActifId);
    if (!marqueur) return;
    marqueur.setAnimation(window.google.maps.Animation.BOUNCE);
    arretAnimationRef.current = window.setTimeout(() => {
      marqueur.setAnimation(null);
    }, DUREE_ANIMATION_SELECTION_MS);

    return () => {
      if (arretAnimationRef.current) {
        window.clearTimeout(arretAnimationRef.current);
        arretAnimationRef.current = null;
      }
    };
  }, [marqueurActifId, marqueurActifSeq]);

  return <div ref={conteneurRef} className="h-80 w-full overflow-hidden rounded-2xl bg-surface-alt" />;
}
