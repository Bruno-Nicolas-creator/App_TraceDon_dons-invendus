export default function ChevronIcon({ ouvert }: { ouvert: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 transition-transform duration-200 ${ouvert ? "rotate-180" : ""}`}
    >
      <path d="M6 9L12 15L18 9" stroke="#6B6459" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
