import { UserRole } from "./roles";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

const users: MockUser[] = [
  {
    id: "u1",
    name: "Laura Gómez",
    email: "laura@dentpro.co",
    role: "patient",
    password: "demo123",
  },
  {
    id: "u2",
    name: "Dr. Santiago Herrera",
    email: "santiago@dentpro.co",
    role: "professional",
    password: "demo123",
  },
  {
    id: "u3",
    name: "Coordinación Chía",
    email: "recepcion@dentpro.co",
    role: "reception",
    password: "demo123",
  },
  {
    id: "u4",
    name: "Ana María Pérez",
    email: "admin@dentpro.co",
    role: "admin",
    password: "demo123",
  },
];

export async function authenticateUser(email: string, password: string): Promise<MockUser | null> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const normalizedEmail = email.toLowerCase();
  const user = users.find((candidate) => candidate.email === normalizedEmail && candidate.password === password);
  return user ?? null;
}

export function findUserById(id: string): MockUser | undefined {
  return users.find((user) => user.id === id);
}
