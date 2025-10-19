#!/usr/bin/env node
const { randomUUID } = require("crypto");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const dbPath = process.env.AUTH_DATABASE_URL ?? path.join(__dirname, "..", "dentpro.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const defaultPassword = process.env.SEED_PASSWORD ?? "demo123";
const passwordHash = bcrypt.hashSync(defaultPassword, 10);

const defaultUsers = [
  { name: "Laura Gómez", email: "laura@dentpro.co", role: "patient" },
  { name: "Dr. Santiago Herrera", email: "santiago@dentpro.co", role: "professional" },
  { name: "Coordinación Chía", email: "recepcion@dentpro.co", role: "reception" },
  { name: "Ana María Pérez", email: "admin@dentpro.co", role: "admin" },
];

db.transaction(() => {
  for (const user of defaultUsers) {
    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(user.email);
    const userId = existing?.id ?? randomUUID();

    if (existing) {
      db.prepare(
        `UPDATE users SET name = ?, password_hash = ?, primary_role_id = ? WHERE id = ?`
      ).run(user.name, passwordHash, user.role, userId);
      db.prepare(`DELETE FROM user_roles WHERE user_id = ?`).run(userId);
    } else {
      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, primary_role_id) VALUES (?, ?, ?, ?, ?)`
      ).run(userId, user.name, user.email, passwordHash, user.role);
    }

    db.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`)
      .run(userId, user.role);
  }
})();

console.log(`Seed completado. Usuarios sincronizados (${defaultUsers.length}) con contraseña "${defaultPassword}".`);
