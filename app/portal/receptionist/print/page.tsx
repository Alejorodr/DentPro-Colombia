import { requireRole } from "@/lib/auth/require-role";
import { ReceptionistPrintView } from "@/app/portal/receptionist/print/ReceptionistPrintView";

export default async function ReceptionistPrintPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["RECEPCIONISTA", "ADMINISTRADOR"]);
  const params = (await searchParams) ?? {};
  const date = typeof params.date === "string" ? params.date : undefined;
  const view = typeof params.view === "string" ? params.view : undefined;
  return <ReceptionistPrintView date={date} view={view} />;
}
