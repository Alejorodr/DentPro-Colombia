import bcrypt from "bcryptjs";
import { getPrismaClient } from "@/lib/prisma";
import { isUserRole, type UserRole } from "./roles";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordChangedAt?: Date | null;
  mfaEnabled?: boolean;
  professional?: { id: string } | null;
  patient?: { id: string } | null;
};

export interface DatabaseUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  professionalId?: string | null;
  patientId?: string | null;
  passwordChangedAt?: Date | null;
  mfaEnabled?: boolean;
}

function mapUser(user: UserRecord | null): DatabaseUser | null {
  if (!user) {
    return null;
  }

  if (!isUserRole(user.role)) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    professionalId: user.professional?.id ?? null,
    patientId: user.patient?.id ?? null,
    passwordChangedAt: user.passwordChangedAt ?? null,
    mfaEnabled: user.mfaEnabled ?? false,
  };
}

export async function authenticateUser(email: string, password: string): Promise<DatabaseUser | null> {
  const normalizedEmail = email.toLowerCase();
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      passwordChangedAt: true,
      mfaEnabled: true,
      professional: { select: { id: true } },
      patient: { select: { id: true } },
    },
  });

  if (!user) {
    return null;
  }

  const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordsMatch) {
    return null;
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;

  return mapUser(safeUser as UserRecord);
}

export async function findUserById(id: string): Promise<DatabaseUser | null> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordChangedAt: true,
      mfaEnabled: true,
      professional: { select: { id: true } },
      patient: { select: { id: true } },
    },
  });

  return mapUser(user as UserRecord | null);
}
