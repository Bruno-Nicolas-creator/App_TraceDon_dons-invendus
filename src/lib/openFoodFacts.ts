export type ProduitScanne = {
  designation: string;
  poidsUnitaireKg: number | null;
};

const USER_AGENT = "DonsInvendus/1.0 (+https://github.com/Bruno-Nicolas-creator/dons-invendus)";

function convertirEnKg(quantite: number, unite: string): number | null {
  switch (unite.toLowerCase()) {
    case "g":
    case "ml":
      return quantite / 1000;
    case "kg":
    case "l":
      return quantite;
    default:
      return null;
  }
}

export async function rechercherProduitParCodeBarre(codeBarre: string): Promise<ProduitScanne | null> {
  const code = codeBarre.trim();
  if (!code) return null;

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_quantity,product_quantity_unit,quantity`;
  const reponse = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  }).catch(() => null);
  if (!reponse || !reponse.ok) return null;

  const donnees = await reponse.json().catch(() => null);
  if (donnees?.status !== 1 || !donnees.product) return null;

  const { product_name, product_quantity, product_quantity_unit } = donnees.product;
  if (!product_name) return null;

  const poidsUnitaireKg =
    typeof product_quantity === "number" && product_quantity_unit
      ? convertirEnKg(product_quantity, product_quantity_unit)
      : null;

  return { designation: product_name, poidsUnitaireKg };
}
