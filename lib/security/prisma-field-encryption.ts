import { Prisma } from "@prisma/client";

import {
  decryptValue,
  documentIdSearchHash,
  encryptJson,
  encryptText,
  isEncryptedValue,
} from "@/lib/security/field-encryption";

/**
 * Campos cifrados en reposo (DOG-18). Texto libre clínico y datos de identidad del paciente.
 * Quedan fuera los campos que se filtran u ordenan en SQL (nombre, correo, motivo de la cita,
 * código de paciente): cifrarlos rompería búsquedas y listados.
 */
export const ENCRYPTED_FIELDS: Record<string, Record<string, "text" | "json">> = {
  PatientProfile: { phone: "text", documentId: "text", address: "text", insuranceProvider: "text" },
  Appointment: { notes: "text" },
  ClinicalNote: { content: "text" },
  ClinicalEpisode: { reason: "text", notes: "text", diagnosis: "text", treatmentPlan: "text" },
  MedicalAllergy: { substance: "text", notes: "text" },
  Prescription: { content: "json" },
  PrescriptionItem: { name: "text", dosage: "text", frequency: "text", instructions: "text" },
  // Cola de correos (DOG-13): el cuerpo lleva enlaces de restablecimiento y datos de la cita.
  EmailOutbox: { html: "text", text: "text" },
};

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
]);

let relationMap: Map<string, Map<string, string>> | null = null;

/** modelo → (campo de relación → modelo destino), desde el DMMF del cliente generado. */
function getRelationMap() {
  if (relationMap) return relationMap;
  relationMap = new Map();
  for (const model of Prisma.dmmf.datamodel.models) {
    const relations = new Map<string, string>();
    for (const field of model.fields) {
      if (field.kind === "object") relations.set(field.name, field.type);
    }
    relationMap.set(model.name, relations);
  }
  return relationMap;
}

type Plain = Record<string, unknown>;

function isPlainObject(value: unknown): value is Plain {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function encryptScalar(kind: "text" | "json", value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (kind === "json") {
    // Prisma.JsonNull / DbNull son instancias especiales: se pasan tal cual.
    if (typeof value === "object" && !Array.isArray(value) && !isPlainObject(value)) return value;
    return encryptJson(value);
  }
  return typeof value === "string" ? encryptText(value) : value;
}

/** Cifra los campos de `data` de un modelo y sigue las escrituras anidadas. */
function encryptData(model: string, data: unknown): unknown {
  if (Array.isArray(data)) return data.map((item) => encryptData(model, item));
  if (!isPlainObject(data)) return data;

  const fields = ENCRYPTED_FIELDS[model];
  const relations = getRelationMap().get(model);
  const result: Plain = { ...data };

  for (const [key, value] of Object.entries(data)) {
    const kind = fields?.[key];
    if (kind) {
      // Forma { set: valor } de las actualizaciones.
      result[key] =
        isPlainObject(value) && "set" in value ? { ...value, set: encryptScalar(kind, value.set) } : encryptScalar(kind, value);
      continue;
    }
    const target = relations?.get(key);
    if (target && isPlainObject(value)) result[key] = encryptNestedWrite(target, value);
  }

  if (model === "PatientProfile" && "documentId" in data) {
    const raw = isPlainObject(data.documentId) ? data.documentId.set : data.documentId;
    if (typeof raw === "string" || raw === null) {
      result.documentIdHash = typeof raw === "string" && !isEncryptedValue(raw) ? documentIdSearchHash(raw) : null;
    }
  }

  return result;
}

/** Operaciones anidadas de Prisma: create, createMany, update, updateMany, upsert, connectOrCreate. */
function encryptNestedWrite(model: string, ops: Plain): Plain {
  const result: Plain = { ...ops };
  const eachItem = (value: unknown, fn: (item: Plain) => Plain) =>
    Array.isArray(value) ? value.map((item) => (isPlainObject(item) ? fn(item) : item)) : isPlainObject(value) ? fn(value) : value;

  if ("create" in ops) result.create = encryptData(model, ops.create);
  if (isPlainObject(ops.createMany)) result.createMany = { ...ops.createMany, data: encryptData(model, ops.createMany.data) };
  if ("connectOrCreate" in ops) {
    result.connectOrCreate = eachItem(ops.connectOrCreate, (item) => ({ ...item, create: encryptData(model, item.create) }));
  }
  if ("upsert" in ops) {
    result.upsert = eachItem(ops.upsert, (item) => ({
      ...item,
      create: encryptData(model, item.create),
      update: encryptData(model, item.update),
    }));
  }
  for (const op of ["update", "updateMany"] as const) {
    if (!(op in ops)) continue;
    // Relación a uno: update recibe los datos directo o { where, data }; a muchos: { where, data } o lista.
    result[op] = eachItem(ops[op], (item) =>
      "data" in item && ("where" in item || Object.keys(item).length === 1)
        ? { ...item, data: encryptData(model, item.data) }
        : (encryptData(model, item) as Plain),
    );
  }
  return result;
}

/** Cifra los argumentos de una escritura de nivel superior. */
export function encryptWriteArgs(model: string, operation: string, args: Plain): Plain {
  if (!WRITE_OPERATIONS.has(operation)) return args;
  const next: Plain = { ...args };
  if (operation === "upsert") {
    next.create = encryptData(model, args.create);
    next.update = encryptData(model, args.update);
  } else if ("data" in args) {
    next.data = encryptData(model, args.data);
  }
  return next;
}

/** Descifra en el lugar cualquier valor cifrado del resultado, incluidas las relaciones. */
export function decryptResult<T>(value: T): T {
  if (typeof value === "string") return decryptValue(value) as T;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) value[index] = decryptResult(value[index]);
    return value;
  }
  if (isPlainObject(value)) {
    const record: Plain = value;
    for (const [key, nested] of Object.entries(record)) {
      if (typeof nested === "string" || Array.isArray(nested) || isPlainObject(nested)) {
        record[key] = decryptResult(nested);
      }
    }
  }
  return value;
}
