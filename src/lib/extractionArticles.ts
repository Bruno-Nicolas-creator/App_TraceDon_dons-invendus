import "server-only";

const MODELE_GEMINI = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

export function isExtractionConfiguree(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export type ArticleExtrait = { designation: string; quantite: string; poidsKg: number };

const PROMPT_EXTRACTION = `Tu analyses la photo ou le document d'une liste de produits alimentaires invendus qu'une entreprise s'apprête à donner à une association. Extrait chaque ligne de produit distincte sous forme d'un tableau JSON.

Pour chaque produit, indique :
- "designation" : le nom du produit tel qu'écrit (ex. "Yaourts nature x12")
- "quantite" : la quantité telle qu'indiquée (ex. "12 unités", "3 kg", "Vrac" si non précisée)
- "poidsKg" : le poids net en kilogrammes (nombre). S'il n'est pas indiqué, estime-le raisonnablement à partir du produit et de la quantité.

Ignore les lignes qui ne sont pas des produits (titres, dates, signatures, totaux). Si l'image ou le document ne contient aucune liste de produits reconnaissable, renvoie un tableau vide.`;

type ReponseGemini = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

function articleExtraitValide(valeur: unknown): valeur is ArticleExtrait {
  if (!valeur || typeof valeur !== "object") return false;
  const item = valeur as Record<string, unknown>;
  return (
    typeof item.designation === "string" &&
    item.designation.trim().length > 0 &&
    typeof item.quantite === "string" &&
    typeof item.poidsKg === "number" &&
    Number.isFinite(item.poidsKg) &&
    item.poidsKg > 0
  );
}

export async function extraireArticlesDepuisFichier(contenu: Buffer, contentType: string): Promise<ArticleExtrait[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Extraction automatique non configurée sur ce déploiement.");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELE_GEMINI}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
                quantite: { type: "STRING" },
                poidsKg: { type: "NUMBER" },
              },
              required: ["designation", "quantite", "poidsKg"],
            },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Extraction automatique échouée (${res.status}) : ${await res.text()}`);
  }

  const data = (await res.json()) as ReponseGemini;
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
    quantite: item.quantite.trim().slice(0, 100) || "Vrac",
    poidsKg: Math.round(item.poidsKg * 100) / 100,
  }));
}
