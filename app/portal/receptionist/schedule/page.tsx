import dynamic from "next/dynamic";

import { requireRole } from "@/lib/auth/require-role";
import { Skeleton } from "@/app/portal/components/ui/Skeleton";

const ReceptionistSchedule = dynamic(
  () => import("@/app/portal/receptionist/schedule/ReceptionistSchedule").then((mod) => mod.ReceptionistSchedule),
  {
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_2fr]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    ),
  },
);

export default async function ReceptionistSchedulePage() {
  await requireRole(["RECEPCIONISTA", "ADMINISTRADOR"]);
  return <ReceptionistSchedule />;
}
