import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDefaultDashboardPath } from "@/lib/auth/roles";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const defaultDashboardPath = getDefaultDashboardPath(session.user.role ?? "PACIENTE");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/10">
        <h1 className="text-xl font-semibold text-slate-900">Cambiar contraseña</h1>
        <p className="mt-1 text-sm text-slate-500">
          Elige una contraseña segura con al menos 8 caracteres, mayúscula, número y símbolo.
        </p>
        <div className="mt-6">
          <ChangePasswordForm
            isMandatory={session.user.mustChangePassword ?? false}
            defaultDashboardPath={defaultDashboardPath}
          />
        </div>
      </div>
    </div>
  );
}
