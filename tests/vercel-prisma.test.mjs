// @vitest-environment node
import { EventEmitter } from 'node:events';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({ spawn: spawnMock, default: { spawn: spawnMock } }));

const { main } = await import('../scripts/vercel-prisma.mjs');

// Fake child process: emits the given stderr and exit code on the next tick.
const fakeChild = ({ code = 0, stderr = '' } = {}) => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  setImmediate(() => {
    if (stderr) child.stderr.emit('data', Buffer.from(stderr));
    child.emit('close', code);
  });
  return child;
};

const queueResults = (...results) => {
  for (const result of results) {
    spawnMock.mockImplementationOnce(() => fakeChild(result));
  }
};

const prismaCalls = () => spawnMock.mock.calls.map(([, args]) => args.slice(2).join(' '));

const productionEnv = {
  VERCEL_ENV: 'production',
  DATABASE_URL: 'postgresql://user:secret@ep-test-pooler.us-east-1.aws.neon.tech/db?sslmode=require',
};

const P3018_STDERR = [
  'Error: P3018',
  '',
  'A migration failed to apply. New migrations cannot be applied before the error is recovered from.',
  '',
  'Migration name: 20261121120000_protect_clinical_records',
  '',
  'Database error code: 42P01',
].join('\n');

const P3009_STDERR = [
  'Error: P3009',
  '',
  'migrate found failed migrations in the target database, new migrations will not be applied.',
  'The `20261121120000_protect_clinical_records` migration started at 2026-11-21 12:00:00.000 UTC failed',
].join('\n');

const P3005_STDERR = 'Error: P3005\n\nThe database schema is not empty.';

describe('scripts/vercel-prisma.mjs', () => {
  let errorSpy;

  beforeEach(() => {
    spawnMock.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const errorOutput = () => errorSpy.mock.calls.map((args) => args.join(' ')).join('\n');

  it('skips migrations outside production without spawning prisma', async () => {
    await expect(main({ env: { VERCEL_ENV: 'preview' } })).resolves.toBe(0);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('succeeds when migrate deploy succeeds and uses the derived direct URL', async () => {
    queueResults({ code: 0 });
    await expect(main({ env: productionEnv })).resolves.toBe(0);
    expect(prismaCalls()).toEqual(['migrate deploy --schema prisma/schema.prisma']);
    const [, , options] = spawnMock.mock.calls[0];
    expect(options.env.DATABASE_URL).toContain('ep-test.us-east-1.aws.neon.tech');
  });

  it('fails the build on an unknown P3018 and never marks it as applied', async () => {
    queueResults({ code: 1, stderr: P3018_STDERR });
    await expect(main({ env: productionEnv })).resolves.toBe(1);
    expect(prismaCalls()).toEqual(['migrate deploy --schema prisma/schema.prisma']);
    expect(prismaCalls().some((call) => call.includes('resolve'))).toBe(false);
    expect(errorOutput()).toContain('P3018: la migración 20261121120000_protect_clinical_records falló');
    expect(errorOutput()).toContain('migrate resolve --rolled-back 20261121120000_protect_clinical_records');
  });

  it('fails the build on P3009 (pre-existing failed migration) without resolving it', async () => {
    queueResults({ code: 1, stderr: P3009_STDERR });
    await expect(main({ env: productionEnv })).resolves.toBe(1);
    expect(prismaCalls().some((call) => call.includes('resolve'))).toBe(false);
    expect(errorOutput()).toContain('P3009: la migración 20261121120000_protect_clinical_records falló');
  });

  it('no longer auto-resolves the former legacy SQLite migrations either (squashed in 0c96089)', async () => {
    queueResults({
      code: 1,
      stderr: 'Error: P3018\nMigration name: 20251127232542_add_appointments\n',
    });
    await expect(main({ env: productionEnv })).resolves.toBe(1);
    expect(prismaCalls().some((call) => call.includes('resolve'))).toBe(false);
  });

  it('fails on P3005 with manual baseline instructions instead of baselining automatically', async () => {
    queueResults({ code: 1, stderr: P3005_STDERR });
    await expect(main({ env: productionEnv })).resolves.toBe(1);
    expect(prismaCalls()).toEqual(['migrate deploy --schema prisma/schema.prisma']);
    expect(errorOutput()).toContain('Baseline manual (una sola vez');
    expect(errorOutput()).toContain('prisma migrate resolve --applied <migracion>');
  });

  it('retries on advisory lock timeouts and then succeeds', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    queueResults({ code: 1, stderr: 'Error: P1002 advisory lock timeout' }, { code: 0 });
    await expect(main({ env: productionEnv, sleep })).resolves.toBe(0);
    expect(spawnMock).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(15000);
  });

  it('rejects placeholder database URLs before running prisma', async () => {
    await expect(
      main({ env: { VERCEL_ENV: 'production', DATABASE_URL: 'postgresql://USER:PASSWORD@HOST:5432/db' } }),
    ).resolves.toBe(1);
    expect(spawnMock).not.toHaveBeenCalled();
  });
});
