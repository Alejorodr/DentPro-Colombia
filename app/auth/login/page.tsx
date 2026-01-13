import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDefaultDashboardPath } from "@/lib/auth/roles";
import { LoginForm } from "@/app/(marketing)/login/LoginForm";

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function AuthLoginPage(props: any) {
  const resolvedProps = props as LoginPageProps;
  const searchParams = (await resolvedProps?.searchParams) ?? {};
  const callbackUrlRaw = searchParams?.callbackUrl;
  const callbackUrl = typeof callbackUrlRaw === "string" && callbackUrlRaw.trim().length > 0 ? callbackUrlRaw : undefined;
  const hasValidCallback =
    callbackUrl !== undefined &&
    callbackUrl !== "/" &&
    !callbackUrl.startsWith("/auth/login") &&
    !callbackUrl.startsWith("/login");

  const session = await auth();

  if (session?.user?.role) {
    const resolvedCallback = hasValidCallback ? callbackUrl : getDefaultDashboardPath(session.user.role);
    redirect(resolvedCallback);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-surface-base">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-light/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:bg-surface-muted/70 dark:text-accent-cyan">
            Seguridad reforzada
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Iniciar sesión</h1>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Accede a tu tablero para administrar agendas, pacientes y reportes. Usa las credenciales que recibiste del equipo administrador.
            </p>
          </div>
        </div>

        <div className="w-full max-w-xl">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </main>
  );
}
