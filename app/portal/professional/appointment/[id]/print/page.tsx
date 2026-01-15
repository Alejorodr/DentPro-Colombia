import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/require-role";
import { getPrismaClient } from "@/lib/prisma";
import { PrintSummary } from "@/app/portal/professional/appointment/[id]/print/print-summary";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfessionalPrintPage({ params }: PrintPageProps) {
  await requireRole("PROFESIONAL");
  const { id } = await params;
  const prisma = getPrismaClient();

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { include: { user: true, allergies: true } },
      professional: { include: { user: true, specialty: true } },
      timeSlot: true,
      clinicalNotes: { orderBy: { updatedAt: "desc" } },
      prescription: { include: { items: true } },
      attachments: true,
    },
  });

  if (!appointment) {
    notFound();
  }

  return <PrintSummary appointment={appointment} />;
}
