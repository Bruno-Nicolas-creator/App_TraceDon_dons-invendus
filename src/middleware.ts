import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "session";

type Role = "ENTREPRISE" | "ASSOCIATION" | "COORDINATEUR";

const ALLOWED_PREFIXES: Record<Role, string[]> = {
  ENTREPRISE: ["/", "/nouveau-don-materiel", "/planning", "/associations", "/archives", "/profil", "/convention", "/bon-enlevement", "/attestations", "/attestation-interet-general", "/messages"],
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

// Mot de passe optionnel pour tout le site, en plus des comptes utilisateurs : utile pour garder
// l'application cachée des visiteurs tant qu'elle n'est pas encore ouverte au public. Tant que
// SITE_PASSWORD n'est pas défini, ce contrôle est simplement désactivé (aucun crash, comportement
// inchangé). Le nom d'utilisateur n'est pas vérifié, seul le mot de passe compte.
//
// Fichier nommé middleware.ts (et non proxy.ts, la nouvelle convention Next.js 16) : sur ce
// déploiement Vercel, SITE_PASSWORD restait invisible (process.env.SITE_PASSWORD vide) une fois le
// fichier nommé proxy.ts, alors que la même variable est lue normalement partout ailleurs dans
// l'app (actions serveur, pages) — ce nom plus ancien, pris en charge depuis des années par Vercel,
// contourne ce problème. Next.js continue de l'accepter (dépréciation annoncée, pas suppression).
function reponseMotDePasseRequis(): NextResponse {
  return new NextResponse("Authentification requise.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Dons Invendus"' },
  });
}

function verifierMotDePasseSite(request: NextRequest): NextResponse | null {
  const motDePasse = process.env.SITE_PASSWORD;
  if (!motDePasse) return null;

  const entete = request.headers.get("authorization");
  if (!entete?.startsWith("Basic ")) return reponseMotDePasseRequis();

  let decode: string;
  try {
    decode = atob(entete.slice(6));
  } catch {
    return reponseMotDePasseRequis();
  }
  const separateur = decode.indexOf(":");
  const motDePasseFourni = separateur === -1 ? decode : decode.slice(separateur + 1);
  if (motDePasseFourni !== motDePasse) return reponseMotDePasseRequis();

  return null;
}

export async function middleware(request: NextRequest) {
  // Diagnostic TEMPORAIRE (à retirer dès que le mot de passe du site fonctionne) : indique si la
  // variable SITE_PASSWORD est bien vue ici, sans jamais révéler sa valeur.
  if (request.nextUrl.pathname === "/__diag") {
    const valeur = process.env.SITE_PASSWORD;
    return new NextResponse(valeur ? `SITE_PASSWORD vue : oui (${valeur.length} caractères)` : "SITE_PASSWORD vue : non (vide ou absente)");
  }

  const reponseAuth = verifierMotDePasseSite(request);
  if (reponseAuth) return reponseAuth;

  const { pathname } = request.nextUrl;

  // Ces deux pages doivent rester joignables sans session (on s'y rend justement pour en obtenir
  // une) — elles passent quand même par le mot de passe du site ci-dessus.
  if (pathname === "/connexion" || pathname === "/inscription") {
    return NextResponse.next();
  }

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
  // connexion/inscription passaient avant par ce filtre pour échapper au cloisonnement par rôle ;
  // elles sont maintenant gérées à l'intérieur de la fonction (ligne 63) pour rester, elles aussi,
  // soumises au mot de passe du site ci-dessus. sw.js reste exclu : c'est le navigateur (pas
  // l'utilisateur connecté) qui le récupère pour les notifications push, avant même de savoir qui
  // est connecté — un mot de passe de site ne doit pas bloquer cette requête technique.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};
