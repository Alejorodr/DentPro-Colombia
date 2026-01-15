import { requireRole } from "@/lib/auth/require-role";
import { ProfessionalDocuments } from "@/app/portal/professional/documents/ProfessionalDocuments";

export default async function ProfessionalDocumentsPage() {
  await requireRole("PROFESIONAL");

  return <ProfessionalDocuments />;
}
