import "server-only";

// gemini-2.0-flash a été définitivement arrêté par Google le 1er juin 2026 ; gemini-3.8-flash
// est le modèle de remplacement recommandé. GEMINI_MODEL permet de changer de modèle sans
// toucher au code si Google fait à nouveau évoluer sa gamme.
const MODELE_GEMINI = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

export function isExtractionConfiguree(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export type ArticleExtrait = { designation: string; quantiteDeclaree: string; poidsKg: number };

// "unites" est renvoyé comme nombre brut (pas de texte libre type "12 unités") pour que la
// quantité affichée suive exactement le même format que la saisie manuelle ou le scan
// ("X unité(s)" / "Vrac") — avant ce choix, le texte libre de Gemini (ex. juste "10", sans mot
// "unité(s)") rendait les articles extraits visuellement différents des autres dans la liste.
const PROMPT_EXTRACTION = `Tu analyses la photo ou le document d'une liste de produits alimentaires invendus qu'une entreprise s'apprête à donner à une association. Extrait chaque ligne de produit distincte sous forme d'un tableau JSON.

Pour chaque produit, indique :
- "designation" : le nom du produit tel qu'écrit (ex. "Yaourts nature x12")
- "unites" : le nombre d'unités si le produit est compté à l'unité (nombre entier). Si le produit est seulement vendu en vrac ou au poids, sans nombre d'unités précisé, omets ce champ.
- "poidsKg" : le poids net total de la ligne en kilogrammes (nombre). S'il n'est pas indiqué, estime-le raisonnablement à partir du produit et de la quantité.

Ignore les lignes qui ne sont pas des produits (titres, dates, signatures, totaux). Si l'image ou le document ne contient aucune liste de produits reconnaissable, renvoie un tableau vide.`;

type ReponseGemini = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

type ArticleExtraitBrut = { designation: string; unites?: number; poidsKg: number };

function articleExtraitValide(valeur: unknown): valeur is ArticleExtraitBrut {
  if (!valeur || typeof valeur !== "object") return false;
  const item = valeur as Record<string, unknown>;
  return (
    typeof item.designation === "string" &&
    item.designation.trim().length > 0 &&
    (item.unites === undefined || (typeof item.unites === "number" && Number.isFinite(item.unites))) &&
    typeof item.poidsKg === "number" &&
    Number.isFinite(item.poidsKg) &&
    item.poidsKg > 0
  );
}

const attendre = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Gemini renvoie fréquemment un 503 "model is overloaded" sur le palier gratuit, surtout aux
// heures de forte affluence — une erreur passagère côté Google, pas un vrai échec : quelques
// nouvelles tentatives rapprochées suffisent presque toujours à faire passer la requête.
const TENTATIVES_MAX = 3;
const DELAIS_RETRY_MS = [1000, 2500];

export async function extraireArticlesDepuisFichier(contenu: Buffer, contentType: string): Promise<ArticleExtrait[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Extraction automatique non configurée sur ce déploiement.");

  const corps = JSON.stringify({
    contents: [
      {
        parts: [{ text: PROMPT_EXTRACTION }, { inline_data: { mime_type: contentType, data: contenu.toString("base64") } }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            designation: { type: "STRING" },
            unites: { type: "NUMBER" },
            poidsKg: { type: "NUMBER" },
          },
          required: ["designation", "poidsKg"],
        },
      },
    },
  });

  let res: Response;
  let texteErreur = "";
  for (let tentative = 1; tentative <= TENTATIVES_MAX; tentative++) {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELE_GEMINI}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: corps }
    );
    if (res.ok) break;
    if (res.status !== 503 || tentative === TENTATIVES_MAX) {
      texteErreur = await res.text().catch(() => "");
      break;
    }
    await attendre(DELAIS_RETRY_MS[tentative - 1]);
  }

  if (!res!.ok) {
    const messageSurcharge =
      res!.status === 503
        ? " — le service Gemini est temporairement surchargé (fréquent sur le palier gratuit), réessaie dans une minute."
        : "";
    throw new Error(`Extraction automatique échouée (${res!.status})${messageSurcharge} : ${texteErreur}`);
  }

  const data = (await res!.json()) as ReponseGemini;
  const texte = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texte) throw new Error("Réponse de l'IA vide ou inattendue.");

  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new Error("Réponse de l'IA illisible (format inattendu).");
  }
  if (!Array.isArray(brut)) throw new Error("Réponse de l'IA invalide (tableau attendu).");

  return brut.filter(articleExtraitValide).map((item) => ({
    designation: item.designation.trim().slice(0, 200),
    // Même format que la saisie manuelle ("X unité(s)" / "Vrac") plutôt que le texte libre
    // renvoyé par Gemini, pour un rendu uniforme avec les articles ajoutés autrement.
    quantiteDeclaree: item.unites != null && item.unites > 0 ? `${Math.round(item.unites)} unité(s)` : "Vrac",
    // Arrondi au gramme près (3 décimales), pas à la dizaine de grammes.
    poidsKg: Math.round(item.poidsKg * 1000) / 1000,
  }));
}
