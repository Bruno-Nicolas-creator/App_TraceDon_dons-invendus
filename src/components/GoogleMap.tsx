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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${cle}&loading=async`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Échec du chargement de Google Maps"));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export default function GoogleMap({
  center,
  marqueurs,
}: {
  center: { lat: number; lng: number };
  marqueurs: Marqueur[];
}) {
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cle = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!cle || !conteneurRef.current) return;
    let annule = false;

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
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#2E6B4E",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });

      const bounds = new google.maps.LatLngBounds();
      bounds.extend(center);
      marqueurs.forEach((m) => {
        const position = { lat: m.lat, lng: m.lng };
        new google.maps.Marker({ position, map: carte, label: { text: m.label, fontSize: "11px" } });
        bounds.extend(position);
      });
      if (marqueurs.length > 0) carte.fitBounds(bounds, 60);
    });

    return () => {
      annule = true;
    };
  }, [center, marqueurs]);

  return <div ref={conteneurRef} className="h-80 w-full overflow-hidden rounded-2xl bg-surface-alt" />;
}
