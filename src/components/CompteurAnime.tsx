"use client";

import { useEffect, useRef, useState } from "react";

export default function CompteurAnime({
  valeur,
  decimales = 0,
  suffixe = "",
  duree = 800,
}: {
  valeur: number;
  decimales?: number;
  suffixe?: string;
  duree?: number;
}) {
  const [affiche, setAffiche] = useState(0);
  const depart = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setAffiche(valeur));
      return () => cancelAnimationFrame(id);
    }

    depart.current = null;
    let frame: number;
    const etape = (t: number) => {
      if (depart.current === null) depart.current = t;
      const progres = Math.min((t - depart.current) / duree, 1);
      const accelerationSortante = 1 - Math.pow(1 - progres, 3);
      setAffiche(valeur * accelerationSortante);
      if (progres < 1) frame = requestAnimationFrame(etape);
    };
    frame = requestAnimationFrame(etape);
    return () => cancelAnimationFrame(frame);
  }, [valeur, duree]);

  return (
    <>
      {affiche.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}
      {suffixe}
    </>
  );
}
