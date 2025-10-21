import { compare } from "bcryptjs";

import { db } from "../db";
import { isUserRole, type UserRole } from "./roles";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  primary_role_id: string;
}

export interface DatabaseUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
}

function mapRowToUser(row: UserRow): DatabaseUser | null {
  if (!isUserRole(row.primary_role_id)) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.primary_role_id,
  };
}

export async function authenticateUser(email: string, password: string): Promise<DatabaseUser | null> {
  const normalizedEmail = email.toLowerCase();
  const statement = db.prepare(
    `SELECT id, name, email, password_hash, primary_role_id FROM users WHERE lower(email) = ?`
  );
  const row = statement.get(normalizedEmail) as UserRow | undefined;
  if (!row) {
    return null;
  }

  const passwordsMatch = await compare(password, row.password_hash);
  if (!passwordsMatch) {
    return null;
  }

  return mapRowToUser(row);
}

export function findUserById(id: string): DatabaseUser | null {
  const statement = db.prepare(
    `SELECT id, name, email, password_hash, primary_role_id FROM users WHERE id = ?`
  );
  const row = statement.get(id) as UserRow | undefined;
  if (!row) {
    return null;
  }

  return mapRowToUser(row);
}

