import bcrypt from "bcryptjs";
import { ensureFallbackDatabaseReady, getPrismaClient } from "@/lib/prisma";
import { isUserRole, type UserRole } from "./roles";

type UserRecord = {
  id: string;
  name: string | null;
  email: string;
  primaryRole: string;
};

export interface DatabaseUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
}

function mapUser(user: UserRecord | null): DatabaseUser | null {
  if (!user) {
    return null;
  }

  if (!isUserRole(user.primaryRole)) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.primaryRole,
  };
}

export async function authenticateUser(email: string, password: string): Promise<DatabaseUser | null> {
  const normalizedEmail = email.toLowerCase();
  const prisma = getPrismaClient();
  await ensureFallbackDatabaseReady();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true, passwordHash: true, primaryRole: true },
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
  await ensureFallbackDatabaseReady();
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, primaryRole: true },
  });

  return mapUser(user);
}
