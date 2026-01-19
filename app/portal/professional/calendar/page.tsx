import dynamic from "next/dynamic";

import { requireRole } from "@/lib/auth/require-role";
import { Skeleton } from "@/app/portal/components/ui/Skeleton";

const ProfessionalCalendar = dynamic(
  () => import("@/app/portal/professional/calendar/ProfessionalCalendar").then((mod) => mod.ProfessionalCalendar),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72" />
      </div>
    ),
  },
);

export default async function ProfessionalCalendarPage() {
  await requireRole("PROFESIONAL");

  return <ProfessionalCalendar />;
}
