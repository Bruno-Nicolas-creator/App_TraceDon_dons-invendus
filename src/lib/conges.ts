export type PeriodeCongesMinimale = { debut: Date; fin: Date };

/** Renvoie la période de congés en cours à la date donnée (aujourd'hui par défaut), s'il y en a une. */
export function periodeCongesActive<T extends PeriodeCongesMinimale>(
  periodes: T[],
  date: Date = new Date()
): T | null {
  return periodes.find((p) => p.debut <= date && date <= p.fin) ?? null;
}

export function estEnConges(periodes: PeriodeCongesMinimale[], date: Date = new Date()): boolean {
  return periodeCongesActive(periodes, date) !== null;
}

export function formaterDateConges(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
