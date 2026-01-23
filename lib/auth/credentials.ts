import { getDefaultDashboardPath, isUserRole } from "@/lib/auth/roles";
import { authenticateUser } from "@/lib/auth/users";

type CredentialsInput = {
  email?: string;
  password?: string;
};

export async function authorizeCredentials(credentials?: CredentialsInput) {
  const email = credentials?.email;
  const password = credentials?.password;

  if (!email || !password) {
    return null;
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const isLocalhost = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");
  const databaseUrl = process.env.DATABASE_URL ?? "";

  const bypassEnabled =
    process.env.TEST_AUTH_BYPASS === "1" ||
    (process.env.NODE_ENV !== "production" && isLocalhost && process.env.TEST_AUTH_BYPASS !== "0") ||
    (!databaseUrl && isLocalhost);

  if (bypassEnabled) {
    const bypassEmail = process.env.TEST_AUTH_EMAIL ?? "admin@dentpro.test";
    const bypassPassword = process.env.TEST_AUTH_PASSWORD ?? "Test1234!";
    const bypassRoleCandidate = process.env.TEST_AUTH_ROLE ?? "ADMINISTRADOR";
    const resolvedRole = isUserRole(bypassRoleCandidate) ? bypassRoleCandidate : "ADMINISTRADOR";

    if (email.toLowerCase() === bypassEmail.toLowerCase() && password === bypassPassword) {
      return {
        id: "test-user",
        name: "QA Admin",
        email: bypassEmail,
        role: resolvedRole,
        professionalId: null,
        patientId: null,
        defaultDashboardPath: getDefaultDashboardPath(resolvedRole),
      } as const;
    }

    return null;
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return null;
  }

  // TODO: Implement 2FA verification for ADMINISTRADOR/PROFESIONAL when mfaEnabled is true.
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    professionalId: user.professionalId ?? null,
    patientId: user.patientId ?? null,
    passwordChangedAt: user.passwordChangedAt ?? null,
    defaultDashboardPath: getDefaultDashboardPath(user.role),
  } as const;
}
