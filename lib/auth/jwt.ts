import { randomBytes } from "crypto";

import { readConfiguredAuthSecret } from "@/lib/auth/secret";

const encoder = new TextEncoder();

const globalForJwt = globalThis as unknown as {
  __authJwtSecret?: Uint8Array;
  __authJwtSecretString?: string;
};

export function getJwtSecretString(): string {
  const secret = readConfiguredAuthSecret();
  if (secret) {
    globalForJwt.__authJwtSecretString = secret;
    return secret;
  }

  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  if (!isBuildPhase && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_JWT_SECRET is not configured");
  }

  if (!globalForJwt.__authJwtSecretString) {
    const generatedSecret = randomBytes(64).toString("hex");
    globalForJwt.__authJwtSecretString = generatedSecret;

    if (!isBuildPhase) {
      console.warn(
        "AUTH_JWT_SECRET is not configured. Generated a fallback secret; configure AUTH_JWT_SECRET or AUTH_SECRET for production environments.",
      );
    }
  }

  return globalForJwt.__authJwtSecretString;
}

export function getJwtSecretKey(): Uint8Array {
  if (!globalForJwt.__authJwtSecret) {
    const secret = getJwtSecretString();
    globalForJwt.__authJwtSecret = encoder.encode(secret);
  }

  return globalForJwt.__authJwtSecret;
}

export function __resetAuthJwtSecretForTests() {
  delete globalForJwt.__authJwtSecret;
  delete globalForJwt.__authJwtSecretString;
}
