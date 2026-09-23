export const TAILLE_MAX_PHOTO_ARTICLE_OCTETS = 5 * 1024 * 1024;

const TYPES_MIME_PHOTO_AUTORISES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validerPhotoArticle(fichier: File): { ok: true } | { ok: false; error: string } {
  if (fichier.size > TAILLE_MAX_PHOTO_ARTICLE_OCTETS) {
    return { ok: false, error: "Photo trop volumineuse (5 Mo maximum)." };
  }
  if (!TYPES_MIME_PHOTO_AUTORISES.has(fichier.type)) {
    return { ok: false, error: "Format non accepté : seules les images (JPEG, PNG, WebP) sont autorisées." };
  }
  return { ok: true };
}
