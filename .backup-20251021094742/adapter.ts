import { randomUUID } from "crypto";
import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";

import { db } from "../db";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  email_verified: string | null;
  image: string | null;
};

type AccountRow = {
  id: string;
  user_id: string;
  type: string;
  provider: string;
  provider_account_id: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
};

type SessionRow = {
  session_token: string;
  user_id: string;
  expires: string;
};

type VerificationTokenRow = {
  identifier: string;
  token: string;
  expires: string;
};

type CreateUserData = Parameters<NonNullable<Adapter["createUser"]>>[0];
type UpdateUserData = Parameters<NonNullable<Adapter["updateUser"]>>[0];
type LinkAccountData = Parameters<NonNullable<Adapter["linkAccount"]>>[0];
type UnlinkAccountParams = Parameters<NonNullable<Adapter["unlinkAccount"]>>[0];
type GetUserByAccountParams = Parameters<
  NonNullable<Adapter["getUserByAccount"]>
>[0];
type CreateSessionData = Parameters<NonNullable<Adapter["createSession"]>>[0];
type UpdateSessionData = Parameters<NonNullable<Adapter["updateSession"]>>[0];
type CreateVerificationTokenData = Parameters<
  NonNullable<Adapter["createVerificationToken"]>
>[0];
type UseVerificationTokenParams = Parameters<
  NonNullable<Adapter["useVerificationToken"]>
>[0];

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function normalizeAccountType(value: unknown): AdapterAccount["type"] {
  return value === "email" || value === "oidc" ? value : "oauth";
}

function toNullableDateISOString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function mapUserRow(row: UserRow | undefined): AdapterUser | null {
  if (!row) {
    return null;
  }

  if (!row.email) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.email_verified ? new Date(row.email_verified) : null,
    image: row.image,
  };
}

function mapAccountRow(row: AccountRow | undefined): AdapterAccount | null {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    type: normalizeAccountType(row.type),
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    refresh_token: row.refresh_token ?? undefined,
    access_token: row.access_token ?? undefined,
    expires_at: row.expires_at ?? undefined,
    token_type: toOptionalString(row.token_type),
    scope: toOptionalString(row.scope),
    id_token: toOptionalString(row.id_token),
    session_state: toOptionalString(row.session_state),
  };
}

function mapSessionRow(row: SessionRow | undefined): AdapterSession | null {
  if (!row) {
    return null;
  }

  return {
    sessionToken: row.session_token,
    userId: row.user_id,
    expires: new Date(row.expires),
  };
}

function mapVerificationTokenRow(row: VerificationTokenRow | undefined): VerificationToken | null {
  if (!row) {
    return null;
  }

  return {
    identifier: row.identifier,
    token: row.token,
    expires: new Date(row.expires),
  };
}

function selectUserById(id: string): AdapterUser | null {
  const row = db
    .prepare(`SELECT id, name, email, email_verified, image FROM users WHERE id = ?`)
    .get(id) as UserRow | undefined;

  return mapUserRow(row);
}

function selectSessionByToken(sessionToken: string): AdapterSession | null {
  const row = db
    .prepare(`SELECT session_token, user_id, expires FROM sessions WHERE session_token = ?`)
    .get(sessionToken) as SessionRow | undefined;

  return mapSessionRow(row);
}

export const sqliteAdapter: Adapter = {
  async createUser(data: CreateUserData): Promise<AdapterUser> {
    const id = randomUUID();
    db.prepare(
      `INSERT INTO users (id, name, email, email_verified, image) VALUES (?, ?, ?, ?, ?)`
    ).run(
      id,
      data.name ?? null,
      data.email ?? null,
      toNullableDateISOString(data.emailVerified),
      data.image ?? null
    );

    const user = selectUserById(id);
    if (!user) {
      throw new Error(`Failed to load user with id ${id}`);
    }

    return user;
  },

  async getUser(id: string): Promise<AdapterUser | null> {
    return selectUserById(id);
  },

  async getUserByEmail(email: string): Promise<AdapterUser | null> {
    const row = db
      .prepare(`SELECT id, name, email, email_verified, image FROM users WHERE lower(email) = lower(?)`)
      .get(email) as UserRow | undefined;
    return mapUserRow(row);
  },

  async getUserByAccount({
    provider,
    providerAccountId,
  }: GetUserByAccountParams): Promise<AdapterUser | null> {
    const row = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.email_verified, u.image
         FROM users u
         INNER JOIN accounts a ON a.user_id = u.id
         WHERE a.provider = ? AND a.provider_account_id = ?`
      )
      .get(provider, providerAccountId) as UserRow | undefined;
    return mapUserRow(row);
  },

  async updateUser(data: UpdateUserData): Promise<AdapterUser> {
    const existing = selectUserById(data.id);
    if (!existing) {
      throw new Error(`User with id ${data.id} not found`);
    }

    const merged: AdapterUser = {
      ...existing,
      ...data,
    };

    db.prepare(
      `UPDATE users
       SET name = ?,
           email = ?,
           email_verified = ?,
           image = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      merged.name ?? null,
      merged.email ?? null,
      toNullableDateISOString(merged.emailVerified ?? null),
      merged.image ?? null,
      merged.id
    );

    const updated = selectUserById(merged.id);
    if (!updated) {
      throw new Error(`Failed to load updated user with id ${merged.id}`);
    }

    return updated;
  },

  async deleteUser(id: string): Promise<AdapterUser | null> {
    const existing = selectUserById(id);
    if (!existing) {
      return null;
    }
    db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
    return existing;
  },

  async linkAccount(account: LinkAccountData): Promise<AdapterAccount | null | undefined> {
    const id = randomUUID();
    db.prepare(
      `INSERT INTO accounts (
         id, user_id, type, provider, provider_account_id,
         refresh_token, access_token, expires_at, token_type,
         scope, id_token, session_state
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      account.userId,
      normalizeAccountType(account.type),
      account.provider,
      account.providerAccountId,
      account.refresh_token ?? null,
      account.access_token ?? null,
      account.expires_at ?? null,
      account.token_type ?? null,
      account.scope ?? null,
      account.id_token ?? null,
      account.session_state ?? null
    );

    return {
      userId: account.userId,
      type: normalizeAccountType(account.type),
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      refresh_token: toOptionalString(account.refresh_token),
      access_token: toOptionalString(account.access_token),
      expires_at: toOptionalNumber(account.expires_at),
      token_type: toOptionalString(account.token_type),
      scope: toOptionalString(account.scope),
      id_token: toOptionalString(account.id_token),
      session_state: toOptionalString(account.session_state),
    } satisfies AdapterAccount;
  },

  async unlinkAccount({
    provider,
    providerAccountId,
  }: UnlinkAccountParams): Promise<AdapterAccount | undefined> {
    const existingRow = db
      .prepare(
        `SELECT id, user_id, type, provider, provider_account_id, refresh_token, access_token,
                expires_at, token_type, scope, id_token, session_state
         FROM accounts
         WHERE provider = ? AND provider_account_id = ?`
      )
      .get(provider, providerAccountId) as AccountRow | undefined;

    db.prepare(`DELETE FROM accounts WHERE provider = ? AND provider_account_id = ?`).run(
      provider,
      providerAccountId
    );

    const account = mapAccountRow(existingRow);
    return account ?? undefined;
  },

  async getSessionAndUser(
    sessionToken: string
  ): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
    const row = db
      .prepare(
        `SELECT s.session_token, s.user_id, s.expires,
                u.id, u.name, u.email, u.email_verified, u.image
         FROM sessions s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.session_token = ?`
      )
      .get(sessionToken) as (SessionRow & UserRow) | undefined;

    if (!row) {
      return null;
    }

    const session = mapSessionRow({
      session_token: row.session_token,
      user_id: row.user_id,
      expires: row.expires,
    })!;

    const user = mapUserRow({
      id: row.id,
      name: row.name,
      email: row.email,
      email_verified: row.email_verified,
      image: row.image,
    })!;

    return { session, user };
  },

  async createSession(session: CreateSessionData): Promise<AdapterSession> {
    db.prepare(`INSERT INTO sessions (session_token, user_id, expires) VALUES (?, ?, ?)`)
      .run(session.sessionToken, session.userId, session.expires.toISOString());

    return mapSessionRow({
      session_token: session.sessionToken,
      user_id: session.userId,
      expires: session.expires.toISOString(),
    })!;
  },

  async updateSession(data: UpdateSessionData): Promise<AdapterSession | null> {
    const existing = selectSessionByToken(data.sessionToken);
    if (!existing) {
      return null;
    }

    const userId = data.userId ?? existing.userId;
    const expires = data.expires ?? existing.expires;

    db.prepare(`UPDATE sessions SET user_id = ?, expires = ?, updated_at = CURRENT_TIMESTAMP WHERE session_token = ?`)
      .run(userId, expires.toISOString(), data.sessionToken);

    return selectSessionByToken(data.sessionToken);
  },

  async deleteSession(sessionToken: string): Promise<AdapterSession | null> {
    const existing = selectSessionByToken(sessionToken);

    db.prepare(`DELETE FROM sessions WHERE session_token = ?`).run(sessionToken);

    return existing;
  },

  async createVerificationToken(token: CreateVerificationTokenData): Promise<VerificationToken> {
    db.prepare(`INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)`)
      .run(token.identifier, token.token, token.expires.toISOString());

    return token;
  },

  async useVerificationToken({ identifier, token }: UseVerificationTokenParams): Promise<
    VerificationToken | null
  > {
    const row = db
      .prepare(`SELECT identifier, token, expires FROM verification_tokens WHERE identifier = ? AND token = ?`)
      .get(identifier, token) as VerificationTokenRow | undefined;

    if (!row) {
      return null;
    }

    db.prepare(`DELETE FROM verification_tokens WHERE identifier = ? AND token = ?`).run(identifier, token);

    return mapVerificationTokenRow(row);
  },
};

