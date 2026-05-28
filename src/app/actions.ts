"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, setSessionCookie, validatePassword } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (!validatePassword(password)) {
    redirect("/?error=invalid");
  }
  await setSessionCookie();
  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}
