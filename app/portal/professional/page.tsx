import { requireRole } from "@/lib/auth/require-role";
import { getProfessionalProfile } from "@/lib/clinical/access";
import { getPrismaClient } from "@/lib/prisma";
import { ProfessionalDashboard } from "@/app/portal/professional/ProfessionalDashboard";

export default async function ProfessionalPortalPage() {
  const session = await requireRole("PROFESIONAL");
  const professional = await getProfessionalProfile(getPrismaClient(), session.user?.id ?? "");
  // DOG-34: el RETHUS es opcional al crear el perfil, pero sale en recetas e impresiones.
  const missingRethus = Boolean(professional) && !professional?.rethusNumber;

  return (
    <div className="flex flex-col gap-6">
      {missingRethus ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <span className="font-semibold">Falta tu número RETHUS.</span> Lo necesitas para que aparezca en tus
          recetas e impresiones. Pídele a administración que lo registre en tu perfil.
        </div>
      ) : null}
      <ProfessionalDashboard />
    </div>
  );
}
