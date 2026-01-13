import { requireRole } from "@/lib/auth/require-role";
import { ClientProfileForm } from "@/app/portal/client/profile/ClientProfileForm";

export default async function ClientProfilePage() {
  await requireRole("PACIENTE");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-blue-600">Profile</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Tu información personal</h1>
      </header>
      <ClientProfileForm />
    </div>
  );
}
