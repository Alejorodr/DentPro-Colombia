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

type BlobInfo = { pathname: string; url: string; size: number };

/**
 * Hoy la subida también guarda en `clinical/…`, pero como privada (`access: "private"`),
 * así que el prefijo no basta para saber si un adjunto está expuesto (DOG-32). Un blob
 * está expuesto si su URL se puede leer sin credenciales: eso es lo que se migra.
 */
async function isPubliclyReadable(url: string) {
  const response = await fetch(url, { method: "HEAD", cache: "no-store" });
  return response.ok;
}

async function listLegacyPrefixBlobs() {
  const { list } = await import("@vercel/blob");
  const blobs = new Map<string, BlobInfo>();
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: PUBLIC_PREFIX, cursor, mode: "expanded" });
    for (const blob of page.blobs) {
      blobs.set(blob.pathname, blob);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

type Classification = {
  exposed: Array<{ attachment: ClinicalAttachmentRecord; blob: BlobInfo }>;
  privateUnderLegacyPrefix: string[];
  missingInBlob: string[];
  alreadyPrivatePrefix: number;
};

async function classify(attachments: ClinicalAttachmentRecord[]): Promise<Classification> {
  const blobs = await listLegacyPrefixBlobs();
  const result: Classification = { exposed: [], privateUnderLegacyPrefix: [], missingInBlob: [], alreadyPrivatePrefix: 0 };

  for (const attachment of attachments) {
    if (attachment.storageKey.startsWith(PRIVATE_PREFIX)) {
      result.alreadyPrivatePrefix += 1;
      continue;
    }
    const blob = blobs.get(attachment.storageKey.replace(/^\//, ""));
    if (!blob) {
      result.missingInBlob.push(attachment.id);
      continue;
    }
    if (await isPubliclyReadable(blob.url)) {
      result.exposed.push({ attachment, blob });
    } else {
      result.privateUnderLegacyPrefix.push(attachment.id);
    }
  }
  return result;
}

async function run() {
  const execute = hasFlag("--execute");
  const attachments = await loadClinicalAttachments();
  const underLegacyPrefix = attachments.filter((item) => !item.storageKey.startsWith(PRIVATE_PREFIX)).length;

  if (!execute && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run (solo base de datos)",
          clinicalAttachments: attachments.length,
          underClinicalPrefix: underLegacyPrefix,
          alreadyPrivatePrefix: attachments.length - underLegacyPrefix,
          note:
            "Los adjuntos bajo clinical/ pueden ser privados (las subidas actuales usan ese prefijo). Define BLOB_READ_WRITE_TOKEN para verificar cuáles están realmente expuestos.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const classification = await classify(attachments);
  const summary = {
    clinicalAttachments: attachments.length,
    exposed: classification.exposed.length,
    privateUnderClinicalPrefix: classification.privateUnderLegacyPrefix.length,
    alreadyPrivatePrefix: classification.alreadyPrivatePrefix,
    missingInBlob: classification.missingInBlob.length,
    missingIds: classification.missingInBlob,
  };

  if (!execute) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          ...summary,
          exposedIds: classification.exposed.map((item) => item.attachment.id),
          nextStep:
            classification.exposed.length === 0
              ? "No hay adjuntos expuestos: no hace falta migrar."
              : "Respalda la base (branch de Neon) y corre con --execute y SECURITY_BLOB_MIGRATION_APPROVED=1.",
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

  const { del, put } = await import("@vercel/blob");
  const prisma = getPrismaClient();
  let migrated = 0;

  for (const { attachment, blob } of classification.exposed) {
    const response = await fetch(blob.url, { cache: "no-store" });
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
    await del(blob.url);
    migrated += 1;
  }

  console.log(JSON.stringify({ mode: "execute", migrated, ...summary }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "Clinical blob migration failed.");
  process.exitCode = 1;
});
