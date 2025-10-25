import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

import { randomBytes } from "crypto";

const encoder = new TextEncoder();

const globalForJwt = globalThis as unknown as {
  __authJwtSecret?: Uint8Array;
  __authJwtSecretString?: string;
};

const FALLBACK_SECRET_PATH = path.join(
  tmpdir(),
  "dentpro-colombia",
  "auth-jwt-secret.txt",
);

function loadPersistedFallbackSecret(): string | null {
  try {
    const secret = fs.readFileSync(FALLBACK_SECRET_PATH, "utf8").trim();
    return secret.length > 0 ? secret : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Failed to read persisted JWT secret", error);
    }
  }

  return null;
}

function writeFallbackSecret(secret: string) {
  try {
    fs.mkdirSync(path.dirname(FALLBACK_SECRET_PATH), { recursive: true });
    fs.writeFileSync(FALLBACK_SECRET_PATH, secret, {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch (error) {
    console.warn(
      "Failed to persist fallback JWT secret. A new secret will be generated on the next run.",
      error,
    );
  }
}

function resolveSecretString(): string {
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

  if (!globalForJwt.__authJwtSecretString) {
    const persisted = loadPersistedFallbackSecret();
    const secret = persisted ?? randomBytes(64).toString("hex");

    globalForJwt.__authJwtSecretString = secret;

    if (!persisted) {
      writeFallbackSecret(secret);
    }

    console.warn(
      "AUTH_JWT_SECRET is not configured. Using a fallback secret stored in the temporary directory.",
    );
  }

  return globalForJwt.__authJwtSecretString;
}

export function getJwtSecretKey(): Uint8Array {
  if (!globalForJwt.__authJwtSecret) {
    const secret = resolveSecretString();
    globalForJwt.__authJwtSecret = encoder.encode(secret);
  }

  return globalForJwt.__authJwtSecret;
}

export function __resetAuthJwtSecretForTests() {
  delete globalForJwt.__authJwtSecret;
  delete globalForJwt.__authJwtSecretString;

  try {
    fs.unlinkSync(FALLBACK_SECRET_PATH);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Failed to remove persisted JWT secret during tests", error);
    }
  }
}
