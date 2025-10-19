import { randomUUID } from "crypto";

import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";

import { db } from "../db";

function mapUserRow(row: any): AdapterUser | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name ?? null,
    email: row.email,
    emailVerified: row.email_verified ? new Date(row.email_verified) : null,
    image: row.image ?? null,
  } satisfies AdapterUser;
}

function mapAccountRow(row: any): AdapterAccount | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    refresh_token: row.refresh_token ?? null,
    access_token: row.access_token ?? null,
    expires_at: row.expires_at ?? null,
    token_type: row.token_type ?? null,
    scope: row.scope ?? null,
    id_token: row.id_token ?? null,
    session_state: row.session_state ?? null,
  } satisfies AdapterAccount;
}

function mapSessionRow(row: any): AdapterSession | null {
  if (!row) {
    return null;
  }

  return {
    sessionToken: row.session_token,
    userId: row.user_id,
    expires: new Date(row.expires),
  } satisfies AdapterSession;
}

export function createSqliteAdapter(): Adapter {
  return {
    async createUser(user) {
      const id = user.id ?? randomUUID();
      const statement = db.prepare(
        `INSERT INTO users (id, name, email, email_verified, image) VALUES (?, ?, ?, ?, ?)`
      );
      statement.run(id, user.name ?? null, user.email, user.emailVerified?.toISOString() ?? null, user.image ?? null);
      const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
      return mapUserRow(row)!;
    },
    async getUser(id) {
      const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
      return mapUserRow(row);
    },
    async getUserByEmail(email) {
      const row = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
      return mapUserRow(row);
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const row = db
        .prepare(
          `SELECT u.* FROM accounts a INNER JOIN users u ON u.id = a.user_id WHERE a.provider = ? AND a.provider_account_id = ?`
        )
        .get(provider, providerAccountId);
      return mapUserRow(row);
    },
    async updateUser(user) {
      if (!user.id) {
        return null;
      }
      const currentRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id);
      if (!currentRow) {
        return null;
      }
      const statement = db.prepare(
        `UPDATE users SET name = ?, email = ?, email_verified = ?, image = ? WHERE id = ?`
      );
      statement.run(
        user.name ?? currentRow.name ?? null,
        user.email ?? currentRow.email,
        user.emailVerified?.toISOString() ?? currentRow.email_verified ?? null,
        user.image ?? currentRow.image ?? null,
        user.id
      );
      const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id);
      return mapUserRow(row)!;
    },
    async deleteUser(id) {
      const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
      if (!row) {
        return null;
      }
      db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
      return mapUserRow(row);
    },
    async linkAccount(account) {
      const id = account.id ?? randomUUID();
      const statement = db.prepare(
        `INSERT OR REPLACE INTO accounts (
          id, user_id, type, provider, provider_account_id, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      statement.run(
        id,
        account.userId,
        account.type,
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
      const row = db.prepare(`SELECT * FROM accounts WHERE id = ?`).get(id);
      return mapAccountRow(row);
    },
    async unlinkAccount({ providerAccountId, provider }) {
      const row = db
        .prepare(`SELECT * FROM accounts WHERE provider = ? AND provider_account_id = ?`)
        .get(provider, providerAccountId);
      if (!row) {
        return undefined;
      }
      db.prepare(`DELETE FROM accounts WHERE provider = ? AND provider_account_id = ?`).run(provider, providerAccountId);
      return;
    },
    async createSession(session) {
      const statement = db.prepare(
        `INSERT INTO sessions (session_token, user_id, expires) VALUES (?, ?, ?)`
      );
      statement.run(session.sessionToken, session.userId, session.expires.toISOString());
      const row = db.prepare(`SELECT * FROM sessions WHERE session_token = ?`).get(session.sessionToken);
      return mapSessionRow(row)!;
    },
    async getSessionAndUser(sessionToken) {
      const row = db
        .prepare(
          `SELECT s.session_token, s.user_id, s.expires, u.* FROM sessions s INNER JOIN users u ON u.id = s.user_id WHERE s.session_token = ?`
        )
        .get(sessionToken);
      if (!row) {
        return null;
      }
      return {
        session: mapSessionRow(row)!,
        user: mapUserRow(row)!,
      };
    },
    async updateSession(session) {
      const statement = db.prepare(
        `UPDATE sessions SET expires = ? WHERE session_token = ?`
      );
      statement.run(session.expires.toISOString(), session.sessionToken);
      const row = db.prepare(`SELECT * FROM sessions WHERE session_token = ?`).get(session.sessionToken);
      return mapSessionRow(row);
    },
    async deleteSession(sessionToken) {
      db.prepare(`DELETE FROM sessions WHERE session_token = ?`).run(sessionToken);
      return null;
    },
    async createVerificationToken(token) {
      const statement = db.prepare(
        `INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)`
      );
      statement.run(token.identifier, token.token, token.expires.toISOString());
      return token satisfies VerificationToken;
    },
    async useVerificationToken({ identifier, token }) {
      const row = db
        .prepare(`SELECT * FROM verification_tokens WHERE identifier = ? AND token = ?`)
        .get(identifier, token);
      if (!row) {
        return null;
      }
      db.prepare(`DELETE FROM verification_tokens WHERE identifier = ? AND token = ?`).run(identifier, token);
      return {
        identifier: row.identifier,
        token: row.token,
        expires: new Date(row.expires),
      } satisfies VerificationToken;
    },
  } satisfies Adapter;
}

export const sqliteAdapter = createSqliteAdapter();
