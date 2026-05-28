import { requireRole } from "@/lib/auth/require-role";
import { OnboardingForm } from "@/app/portal/client/onboarding/OnboardingForm";

export const metadata = { title: "Completa tu perfil · DentPro" };

export default async function ClientOnboardingPage() {
  await requireRole("PACIENTE");

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Bienvenido a DentPro</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Completa tu perfil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Para agendar citas y recibir atención necesitamos algunos datos básicos. Solo tomarás unos minutos.
        </p>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-surface-muted/60 dark:bg-surface-muted">
        <OnboardingForm />
      </div>
    </div>
  );
}
