import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "session";

type Role = "ENTREPRISE" | "ASSOCIATION" | "COORDINATEUR";

const ALLOWED_PREFIXES: Record<Role, string[]> = {
  ENTREPRISE: ["/", "/mes-dons", "/nouveau-don-materiel", "/planning", "/associations", "/archives", "/profil", "/convention", "/bon-enlevement", "/attestations", "/attestation-interet-general", "/messages"],
  ASSOCIATION: ["/dons", "/bon-enlevement", "/archives", "/profil", "/convention", "/attestations", "/attestation-interet-general", "/messages"],
  COORDINATEUR: ["/coordinateur", "/archives", "/profil", "/messages"],
};

const LANDING: Record<Role, string> = {
  ENTREPRISE: "/",
  ASSOCIATION: "/dons",
  COORDINATEUR: "/coordinateur",
};

function isAllowed(role: Role, pathname: string): boolean {
  return ALLOWED_PREFIXES[role].some((prefix) => (prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;

  let role: Role | null = null;
  if (token && secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      role = payload.role as Role;
    } catch {
      role = null;
    }
  }

  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Les routes API appliquent elles-mêmes une autorisation fine (propriété de la ressource) ;
  // elles ne sont pas soumises au cloisonnement de navigation par rôle ci-dessous.
  const estRouteApi = pathname.startsWith("/api/");

  if (!estRouteApi && !isAllowed(role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = LANDING[role];
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // sw.js doit rester accessible sans authentification : c'est le navigateur (pas l'utilisateur
  // connecté) qui le récupère pour les notifications push, avant même de savoir qui est connecté.
  // Idem pour les icônes (onglet, écran d'accueil iPhone/Android) : ce sont des images publiques
  // demandées par le navigateur, y compris sur la page de connexion.
  matcher: ["/((?!connexion|inscription|mot-de-passe-oublie|confirmer-email|_next/static|_next/image|favicon.ico|manifest.json|sw.js|apple-icon.png|icon-192.png|icon-512.png).*)"],
};
