export const SEUIL_GRANDE_SURFACE_M2 = 400;

export function estGrandeSurface(surfaceVenteM2: number | null): boolean {
  return surfaceVenteM2 != null && surfaceVenteM2 > SEUIL_GRANDE_SURFACE_M2;
}

export function associationHabilitee(habilitationStatut: string): boolean {
  return habilitationStatut !== "NON_HABILITEE";
}

export function libelleHabilitation(habilitationStatut: string): string {
  switch (habilitationStatut) {
    case "NATIONALE":
      return "Habilitation nationale";
    case "REGIONALE":
      return "Habilitation régionale";
    default:
      return "Non habilitée";
  }
}
