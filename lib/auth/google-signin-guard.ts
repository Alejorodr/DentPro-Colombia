import type { DatabaseUser } from "./users";

type GoogleProfile = {
  email?: string;
  email_verified?: boolean;
};

export async function validateGoogleSignIn(
  profile: GoogleProfile | undefined,
  findUser: (email: string) => Promise<DatabaseUser | null>,
  autoCreate: boolean,
): Promise<boolean> {
  const email = typeof profile?.email === "string" ? profile.email.toLowerCase() : "";
  const emailVerified = profile?.email_verified === true;

  if (!email || !emailVerified) return false;

  const existingUser = await findUser(email);

  if (!existingUser) return autoCreate;

  return existingUser.active;
}
