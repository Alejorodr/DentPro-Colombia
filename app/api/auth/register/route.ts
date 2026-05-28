import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse, internalServerErrorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from "@/lib/auth/password-policy";
import { Prisma } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

const registerSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  lastName: z.string().trim().min(1, "El apellido es obligatorio.").max(120),
  email: z.string().trim().email("Ingresa un correo válido.").max(120),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(200)
    .regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
  phone: z.string().trim().max(30).optional(),
});

export async function POST(request: Request) {
  const { data: payload, error } = await parseJson(request, registerSchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const passwordHash = await bcrypt.hash(payload.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase(),
        passwordHash,
        role: "PACIENTE",
        name: payload.name,
        lastName: payload.lastName,
        patient: {
          create: {
            phone: payload.phone ?? null,
            active: true,
          },
        },
      },
      select: { id: true, email: true, name: true, role: true },
    });

    void logAuditEvent({
      action: "auth.register.patient_created",
      resourceType: "user",
      resourceId: user.id,
      targetLabel: user.email,
      status: "success",
      metadata: { method: "credentials" },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse("Ya existe una cuenta con ese correo.", 409);
    }
    return internalServerErrorResponse("No se pudo crear la cuenta. Inténtalo de nuevo.");
  }
}
