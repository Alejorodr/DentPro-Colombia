"use client";

import type { SelectHTMLAttributes } from "react";

import { DOCUMENT_TYPES, type DocumentTypeCode } from "@/lib/regulatory/colombia";

/** Selector de tipo de documento con los códigos de la tabla RIPS (DOG-34). */
export function DocumentTypeSelect({
  value,
  onValueChange,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & {
  value: DocumentTypeCode;
  onValueChange: (value: DocumentTypeCode) => void;
}) {
  return (
    <select {...props} value={value} onChange={(event) => onValueChange(event.target.value as DocumentTypeCode)}>
      {DOCUMENT_TYPES.map((type) => (
        <option key={type.code} value={type.code}>
          {type.code} · {type.label}
        </option>
      ))}
    </select>
  );
}
