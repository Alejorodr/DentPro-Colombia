import { randomBytes } from "crypto";

const encoder = new TextEncoder();

const globalForJwt = globalThis as unknown as {
  __authJwtSecret?: Uint8Array;
  __authJwtSecretString?: string;
};

export function getJwtSecretString(): string {
  const candidates = [
    process.env.AUTH_JWT_SECRET,
    process.env.NEXTAUTH_SECRET,
    process.env.AUTH_SECRET,
  ];

  for (const secret of candidates) {
    if (secret && secret.trim().length > 0) {
      return secret;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    if (!globalForJwt.__authJwtSecretString) {
      const generatedSecret = randomBytes(64).toString("hex");
      globalForJwt.__authJwtSecretString = generatedSecret;

      console.warn(
        "AUTH_JWT_SECRET is not configured. Generated a development-only fallback secret.",
      );
    }

    return globalForJwt.__authJwtSecretString;
  }

  throw new Error("AUTH_JWT_SECRET is not configured");
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
