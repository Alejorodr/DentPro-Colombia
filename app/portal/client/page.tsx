import { requireRole } from "@/lib/auth/require-role";
import { ClientPanel } from "@/app/portal/client/ClientPanel";

export default async function ClientPortalPage() {
  await requireRole("PACIENTE");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Portal Cliente</p>
        <h1 className="text-2xl font-semibold text-slate-900">Mi espacio</h1>
        <p className="text-sm text-slate-600">Gestiona tu perfil y revisa tus citas.</p>
      </header>
      <ClientPanel />
    </div>
  );
}
