"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

export default function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (codeBarre: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [erreurCamera, setErreurCamera] = useState<string | null>(null);
  const [codeManuel, setCodeManuel] = useState("");

  useEffect(() => {
    let annule = false;

    import("@zxing/browser").then(({ BrowserMultiFormatReader }) => {
      if (annule || !videoRef.current) return;
      const lecteur = new BrowserMultiFormatReader();
      lecteur
        .decodeFromVideoDevice(undefined, videoRef.current, (resultat, _erreur, controles) => {
          if (resultat) {
            controles.stop();
            onDetected(resultat.getText());
          }
        })
        .then((controles) => {
          if (annule) {
            controles.stop();
            return;
          }
          controlsRef.current = controles;
        })
        .catch(() => {
          if (!annule) setErreurCamera("Caméra indisponible. Saisis le code-barres manuellement ci-dessous.");
        });
    });

    return () => {
      annule = true;
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  const validerCodeManuel = () => {
    if (codeManuel.trim()) onDetected(codeManuel.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5">
      <div className="w-full max-w-md rounded-2xl bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Scanner un code-barres</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-ink-muted">
            &times;
          </button>
        </div>

        <div className="overflow-hidden rounded-xl bg-ink">
          <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
        </div>

        {erreurCamera && <p className="mt-2.5 text-xs text-accent">{erreurCamera}</p>}

        <div className="mt-3.5 flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={codeManuel}
            onChange={(e) => setCodeManuel(e.target.value)}
            placeholder="Ou saisir le code-barres"
            className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={validerCodeManuel}
            className="shrink-0 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
