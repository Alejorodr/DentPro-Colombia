import { requireRole } from "@/lib/auth/require-role";
import { ProfessionalCalendar } from "@/app/portal/professional/calendar/ProfessionalCalendar";

export default async function ProfessionalCalendarPage() {
  await requireRole("PROFESIONAL");

  return <ProfessionalCalendar />;
}
