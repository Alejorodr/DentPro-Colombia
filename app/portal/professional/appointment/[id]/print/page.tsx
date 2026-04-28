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
    select: {
      id: true,
      reason: true,
      serviceName: true,
      patient: { select: { patientCode: true, user: { select: { name: true, lastName: true, email: true } } } },
      professional: { select: { user: { select: { name: true } } } },
      timeSlot: { select: { startAt: true, endAt: true } },
      clinicalNotes: { select: { content: true }, orderBy: { updatedAt: "desc" } },
      prescription: {
        select: {
          items: {
            select: { id: true, name: true, dosage: true, frequency: true, instructions: true },
          },
        },
      },
      attachments: { select: { id: true, filename: true, url: true, dataUrl: true } },
    },
  });

  if (!appointment) {
    notFound();
  }

  return <PrintSummary appointment={appointment} />;
}
