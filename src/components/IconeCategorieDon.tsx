function Trace({ id, stroke }: { id: string; stroke: string }) {
  switch (id) {
    case "viande_poisson":
      return (
        <path
          d="M13.8 4.2C16.6 4.2 18.6 6.6 17.8 9.4C17.1 11.7 14.7 12.7 12.9 13.2L9.6 16.8C8.7 17.8 7.2 17.9 6.3 17C5.4 16.1 5.5 14.6 6.4 13.7L9.7 10.1C9.2 8.3 10.1 5.7 12.4 4.6C12.9 4.4 13.4 4.2 13.8 4.2Z"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case "cremerie":
      return (
        <>
          <path d="M9 9L9 5.5L12 3L15 5.5V9" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path
            d="M8 9H16V19.3C16 19.7 15.7 20 15.3 20H8.7C8.3 20 8 19.7 8 19.3V9Z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </>
      );
    case "plats_cuisines":
      return (
        <>
          <circle cx="12" cy="14.5" r="6.5" stroke={stroke} strokeWidth="1.6" />
          <path d="M9.2 4.5C9.2 5.5 8.2 6 8.2 7S9.2 8.5 9.2 9.5" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M13.2 4.5C13.2 5.5 12.2 6 12.2 7S13.2 8.5 13.2 9.5" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
    case "sandwich":
      return (
        <>
          <path d="M4 18L12 6L20 18H4Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M7.2 14H16.8" stroke={stroke} strokeWidth="1.3" />
        </>
      );
    case "oeufs":
      return (
        <path
          d="M12 4C9 4 7 9 7 14C7 18 9 20.5 12 20.5C15 20.5 17 18 17 14C17 9 15 4 12 4Z"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case "surgeles":
      return (
        <path
          d="M12 3V21M4.9 7.5L19.1 16.5M19.1 7.5L4.9 16.5M12 3L10.3 5.3M12 3L13.7 5.3M12 21L10.3 18.7M12 21L13.7 18.7"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      );
    case "legumes":
      return (
        <>
          <path
            d="M9.5 4.5C13 5.5 15.5 8.5 14.7 12.5C14 16 10.8 20 9 20C7.4 20 6.5 17.6 6.5 14.8C6.5 10.8 8 6.8 9.5 4.5Z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9.5 4.5L8 2.3M9.5 4.5L9.7 2M9.5 4.5L11.3 2.7" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
    case "fruits":
      return (
        <>
          <path
            d="M12 9C9 9 6.8 11.2 6.8 14.3C6.8 17.5 9 20 12 20C15 20 17.2 17.5 17.2 14.3C17.2 11.2 15 9 12 9Z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M12 9C12 7 12.6 5.6 14 5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M12 7.3C12.8 6.2 14.3 5.9 15.2 6.8" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
    case "pain":
      return (
        <>
          <path
            d="M4 14C4 10.5 7.2 7.5 12 7.5C16.8 7.5 20 10.5 20 14C20 17 16.8 18 12 18C7.2 18 4 17 4 14Z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9 9.5L8 12.5M12.5 8.5L11.5 12.5M16 9.5L15 12.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case "viennoiseries":
      return (
        <path
          d="M5 14C5 9 9 5.5 13 6.5C11 7.5 10 9.5 10.5 12C11 14.5 13 16 15.5 15.5C14 18.5 10 19.5 7.5 17.5C6 16.5 5 15.5 5 14Z"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case "feculents":
      return (
        <>
          <path
            d="M4 12H20C20 16.5 16.5 20 12 20C7.5 20 4 16.5 4 12Z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M8 12V10M12 12V9M16 12V10" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
    case "produits_sucres":
      return (
        <>
          <circle cx="12" cy="9" r="4.5" stroke={stroke} strokeWidth="1.6" />
          <path d="M12 13.5V20" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    case "condiments":
      return (
        <path
          d="M10.5 4H13.5V6.5L14.5 8V19.5C14.5 20 14 20.5 13.5 20.5H10.5C10 20.5 9.5 20 9.5 19.5V8L10.5 6.5V4Z"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case "conserves":
      return (
        <>
          <rect x="7.5" y="5" width="9" height="3" rx="1" stroke={stroke} strokeWidth="1.5" />
          <rect x="6.5" y="8" width="11" height="12" rx="1.5" stroke={stroke} strokeWidth="1.6" />
        </>
      );
    case "boissons":
      return (
        <>
          <path
            d="M8 8H16L15.2 19C15.1 19.6 14.6 20 14 20H10C9.4 20 8.9 19.6 8.8 19L8 8Z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M8.6 11.5H15.4" stroke={stroke} strokeWidth="1.3" />
          <path d="M14.2 8L15.8 3.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case "hygiene":
      return (
        <>
          <rect x="8" y="9" width="8" height="11" rx="1.5" stroke={stroke} strokeWidth="1.6" />
          <path d="M10.5 9V6.5H13.5V9" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M13.5 6.5H16" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case "bebe":
      return (
        <>
          <path
            d="M9 3.5H13V6L14 7V19C14 19.8 13.3 20.5 12.5 20.5H9.5C8.7 20.5 8 19.8 8 19V7L9 6V3.5Z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M8 11H14" stroke={stroke} strokeWidth="1.3" />
        </>
      );
    case "animaux":
      return (
        <>
          <circle cx="12" cy="15" r="3.2" stroke={stroke} strokeWidth="1.5" />
          <circle cx="7" cy="10" r="1.8" stroke={stroke} strokeWidth="1.4" />
          <circle cx="11" cy="7.5" r="1.8" stroke={stroke} strokeWidth="1.4" />
          <circle cx="15.5" cy="7.8" r="1.8" stroke={stroke} strokeWidth="1.4" />
          <circle cx="17.5" cy="11.5" r="1.8" stroke={stroke} strokeWidth="1.4" />
        </>
      );
    default:
      return <path d="M4 7L12 3L20 7V17L12 21L4 17V7Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />;
  }
}

export default function IconeCategorieDon({ id, active = false }: { id: string; active?: boolean }) {
  const stroke = active ? "#2E6B4E" : "#6B6459";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <Trace id={id} stroke={stroke} />
    </svg>
  );
}
