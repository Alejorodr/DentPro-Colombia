import { requireRole } from "@/lib/auth/require-role";
import { ClientBookingForm } from "@/app/portal/client/book/ClientBookingForm";

export default async function ClientBookPage() {
  await requireRole("PACIENTE");

  return (
    <div className="space-y-6">
      <ClientBookingForm />
    </div>
  );
}
