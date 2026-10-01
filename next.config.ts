import type { NextConfig } from "next";

// En-têtes de sécurité de base, appliqués à toutes les réponses. Pas de Content-Security-Policy
// ici : il faudrait lister précisément chaque script/style externe utilisé (Google Maps, DocuSign,
// polices) et une erreur casserait silencieusement une fonctionnalité — à traiter séparément,
// avec ses propres tests, plutôt qu'en même temps que ce nettoyage à faible risque.
const nextConfig: NextConfig = {
  // Next.js limite par défaut le corps d'une action serveur à 1 Mo — bien en-deçà des 5 Mo
  // qu'on accepte nous-mêmes pour une pièce jointe, un document ou une photo (cf. src/lib/
  // documents.ts, src/lib/messagerie.ts). Sans ce réglage, tout envoi dépassant 1 Mo (une photo
  // prise directement avec l'appareil photo d'un téléphone, typiquement) plante avec une erreur
  // générique au lieu du message clair "fichier trop volumineux" prévu pour ce cas.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
