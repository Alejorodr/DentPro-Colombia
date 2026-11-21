import { requireRole } from "@/lib/auth/require-role";
import { getActiveAppointmentCountForUser } from "@/lib/appointments/patient-active-count";
import { ClientBookingForm } from "@/app/portal/client/book/ClientBookingForm";

export default async function ClientBookPage() {
  const session = await requireRole("PACIENTE");
  const activeAppointmentsCount = await getActiveAppointmentCountForUser(session?.user?.id);

  return (
    <div className="space-y-6">
      <ClientBookingForm activeAppointmentsCount={activeAppointmentsCount} />
    </div>
  );
}
