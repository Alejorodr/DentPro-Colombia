import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/homepage/_lib";
import {
  MARKETING_IMAGE_MAX_BYTES,
  buildMarketingImageStorageKey,
  isAllowedMarketingImageType,
  isAllowedMarketingUploadFolder,
  sanitizeMarketingImageFilename,
  uploadPublicMarketingImage,
} from "@/lib/marketing/images";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return admin.response;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = formData.get("folder");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo inválido o ausente." }, { status: 400 });
  }

  if (typeof folder !== "string" || !isAllowedMarketingUploadFolder(folder)) {
    return NextResponse.json({ error: "Carpeta de upload inválida." }, { status: 400 });
  }

  if (!isAllowedMarketingImageType(file.type)) {
    return NextResponse.json(
      { error: "Tipo de archivo no permitido. Usa JPEG, PNG o WEBP." },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MARKETING_IMAGE_MAX_BYTES) {
    return NextResponse.json(
      { error: `Archivo demasiado grande. Máximo ${Math.floor(MARKETING_IMAGE_MAX_BYTES / 1024 / 1024)}MB.` },
      { status: 400 },
    );
  }

  const sanitizedFilename = sanitizeMarketingImageFilename(file.name, file.type);
  const storageKey = buildMarketingImageStorageKey(folder, sanitizedFilename);

  try {
    const publicUrl = await uploadPublicMarketingImage(file, storageKey, file.type);
    return NextResponse.json({ url: publicUrl, pathname: storageKey }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo subir la imagen. Intenta de nuevo." }, { status: 500 });
  }
}
