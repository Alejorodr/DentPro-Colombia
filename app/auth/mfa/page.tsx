import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { requiresMfa } from "@/lib/auth/mfa";
import { resolveRoleAwarePortalPath } from "@/lib/auth/roles";
import { findUserById } from "@/lib/auth/users";

import { MfaForm } from "./MfaForm";

export const metadata: Metadata = {
  title: "Verificación en dos pasos",
};

type MfaPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Segundo paso del inicio de sesión para administradores y profesionales (DOG-28). */
export default async function MfaPage({ searchParams }: MfaPageProps) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;
  const destination = resolveRoleAwarePortalPath(user.role, callbackUrl);

  if (!requiresMfa(user.role) || !user.mfaPending) {
    redirect(destination);
  }

  const dbUser = await findUserById(user.id);
  const mode = dbUser?.mfaEnabled ? "verify" : "enroll";

  return (
    <div className="min-h-dvh bg-hero-light px-4 py-12 transition-colors duration-300 dark:bg-hero-dark sm:py-16">
      <div className="mx-auto max-w-md">
        <MfaForm mode={mode} destination={destination} email={user.email ?? ""} />
      </div>
    </div>
  );
}
