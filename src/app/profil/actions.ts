"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie } from "@/lib/auth";

export async function deconnexionAction() {
  await clearSessionCookie();
  redirect("/connexion");
}
