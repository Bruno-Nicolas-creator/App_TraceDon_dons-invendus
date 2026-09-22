import "server-only";
import { headers } from "next/headers";

export async function origineRequete(): Promise<string> {
  const en = await headers();
  const proto = en.get("x-forwarded-proto") ?? "http";
  const host = en.get("host");
  return `${proto}://${host}`;
}
