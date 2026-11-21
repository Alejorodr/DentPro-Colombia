import { createHash } from "node:crypto";
import { basename } from "node:path";

import { getPrismaClient } from "../../lib/prisma";

const PRIVATE_PREFIX = "clinical-private/";
const PUBLIC_PREFIX = "clinical/";

type ClinicalAttachmentRecord = {
  id: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  size: number;
  checksum: string | null;
};

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function hashBuffer(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function loadClinicalAttachments() {
  const prisma = getPrismaClient();
  return prisma.clinicalAttachment.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      storageKey: true,
      filename: true,
      mimeType: true,
      size: true,
      checksum: true,
    },
    orderBy: { createdAt: "asc" },
  }) as unknown as Promise<ClinicalAttachmentRecord[]>;
}

async function run() {
  const execute = hasFlag("--execute");
  const attachments = await loadClinicalAttachments();

  if (!execute) {
    const alreadyPrivate = attachments.filter((item) => item.storageKey.startsWith(PRIVATE_PREFIX)).length;
    const legacy = attachments.length - alreadyPrivate;
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          clinicalAttachments: attachments.length,
          alreadyPrivate,
          requiringInventoryOrMigration: legacy,
          publicPrefix: PUBLIC_PREFIX,
          privatePrefix: PRIVATE_PREFIX,
          nextStep: "Review this inventory and run with --execute plus SECURITY_BLOB_MIGRATION_APPROVED=1 only against isolated storage.",
        },
        null,
        2,
      ),
    );
    return;
  }

  if (process.env.SECURITY_BLOB_MIGRATION_APPROVED !== "1") {
    throw new Error("Refusing to migrate: set SECURITY_BLOB_MIGRATION_APPROVED=1 after reviewing the dry-run.");
  }

  const { del, list, put } = await import("@vercel/blob");
  const blobs = new Map<string, { pathname: string; url: string; size: number }>();
  let cursor: string | undefined;

  do {
    const page = await list({ prefix: PUBLIC_PREFIX, cursor, mode: "expanded" });
    for (const blob of page.blobs) {
      blobs.set(blob.pathname, blob);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const prisma = getPrismaClient();
  let migrated = 0;
  let skipped = 0;
  const pending: string[] = [];

  for (const attachment of attachments) {
    if (attachment.storageKey.startsWith(PRIVATE_PREFIX)) {
      skipped += 1;
      continue;
    }

    const source = blobs.get(attachment.storageKey);
    if (!source) {
      pending.push(attachment.id);
      continue;
    }

    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`Unable to read source blob for attachment ${attachment.id}: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length !== attachment.size || (attachment.checksum && hashBuffer(buffer) !== attachment.checksum)) {
      throw new Error(`Integrity check failed for attachment ${attachment.id}`);
    }

    const targetKey = `${PRIVATE_PREFIX}${attachment.id}/${basename(attachment.storageKey)}`;
    const target = await put(targetKey, buffer, {
      access: "private",
      addRandomSuffix: false,
      contentType: attachment.mimeType,
    });

    await prisma.clinicalAttachment.update({
      where: { id: attachment.id },
      data: { storageKey: target.pathname },
    });
    await del(source.url);
    migrated += 1;
  }

  console.log(JSON.stringify({ mode: "execute", migrated, skipped, pending: pending.length, pendingIds: pending }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "Clinical blob migration failed.");
  process.exitCode = 1;
});
