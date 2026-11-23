import { EventEmitter } from "node:events";
import type { Pool, PoolClient } from "pg";
import { describe, expect, it } from "vitest";

import { serializeClientQueries, serializePoolClientQueries } from "@/lib/db/serialize-pg-queries";

function createFakeClient() {
  let active = 0;
  let maxActive = 0;
  const started: string[] = [];
  const client = {
    query(text: unknown, ...rest: unknown[]) {
      const callback = rest.find((arg) => typeof arg === "function") as ((err: unknown, res: unknown) => void) | undefined;
      if (callback) {
        callback(null, { text });
        return undefined;
      }
      active += 1;
      maxActive = Math.max(maxActive, active);
      started.push(String(text));
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          active -= 1;
          if (text === "FAIL") reject(new Error("boom"));
          else resolve({ text });
        }, 5);
      });
    },
  };
  return { client: client as unknown as PoolClient, stats: () => ({ maxActive, started }) };
}

describe("serializeClientQueries (DOG-9)", () => {
  it("ejecuta las consultas simultáneas de una conexión de a una y en orden", async () => {
    const { client, stats } = createFakeClient();
    serializeClientQueries(client);

    const results = await Promise.all(["A", "B", "C"].map((text) => client.query(text)));

    expect(results).toEqual([{ text: "A" }, { text: "B" }, { text: "C" }]);
    expect(stats()).toEqual({ maxActive: 1, started: ["A", "B", "C"] });
  });

  it("un error no bloquea las consultas siguientes", async () => {
    const { client } = createFakeClient();
    serializeClientQueries(client);

    const [failed, ok] = await Promise.allSettled([client.query("FAIL"), client.query("OK")]);

    expect(failed.status).toBe("rejected");
    expect(ok).toEqual({ status: "fulfilled", value: { text: "OK" } });
  });

  it("deja pasar las llamadas con callback y no envuelve dos veces", () => {
    const { client } = createFakeClient();
    serializeClientQueries(client);
    const wrapped = client.query;
    serializeClientQueries(client);
    expect(client.query).toBe(wrapped);

    let received: unknown;
    (client.query as unknown as (text: string, cb: (err: unknown, res: unknown) => void) => void)("SELECT 1", (_err, res) => {
      received = res;
    });
    expect(received).toEqual({ text: "SELECT 1" });
  });

  it("serializa cada conexión nueva del pool", async () => {
    const pool = new EventEmitter() as unknown as Pool;
    serializePoolClientQueries(pool);
    const { client, stats } = createFakeClient();
    (pool as unknown as EventEmitter).emit("connect", client);

    await Promise.all([client.query("X"), client.query("Y")]);

    expect(stats().maxActive).toBe(1);
  });
});
