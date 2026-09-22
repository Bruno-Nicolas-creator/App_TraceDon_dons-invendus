/** Rend un numéro de téléphone cliquable (ouvre le composeur d'appel sur mobile). */
export default function LienTelephone({ numero, className }: { numero: string; className?: string }) {
  const href = `tel:${numero.replace(/[^\d+]/g, "")}`;
  return (
    <a href={href} className={className ?? "underline decoration-dotted underline-offset-2"}>
      {numero}
    </a>
  );
}
