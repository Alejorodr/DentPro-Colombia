import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import type { PatientSummary } from "@/lib/api/types";

export async function GET() {
  const prisma = getPrismaClient();

  try {
    const patients = await prisma.patient.findMany({
      orderBy: { name: "asc" },
    });

    const payload: PatientSummary[] = patients.map((patient) => ({
      id: patient.id,
      name: patient.name,
      email: patient.email ?? "",
      phone: patient.phone ?? "",
    }));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to fetch patients", error);
    return NextResponse.json({ error: "No se pudieron cargar los pacientes." }, { status: 500 });
  }
}
