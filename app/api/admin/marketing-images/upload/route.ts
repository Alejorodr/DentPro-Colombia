import { requireAdmin } from "@/app/api/admin/homepage/_lib";
import { logApiError } from "@/app/api/_utils/observability";
import { errorResponse, internalServerErrorResponse } from "@/app/api/_utils/response";
import { logAuditEvent } from "@/lib/audit";
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
    await logAuditEvent({
      actor: {
        userId: admin.sessionUser.id,
        role: admin.sessionUser.role,
      },
      action: "marketing.image.uploaded",
      resourceType: "marketing_image_upload",
      status: "failure",
      metadata: {
        reason: "invalid_file",
      },
    });
    return errorResponse("Archivo inválido o ausente.", 400);
  }

  if (typeof folder !== "string" || !isAllowedMarketingUploadFolder(folder)) {
    await logAuditEvent({
      actor: {
        userId: admin.sessionUser.id,
        role: admin.sessionUser.role,
      },
      action: "marketing.image.uploaded",
      resourceType: "marketing_image_upload",
      status: "failure",
      metadata: {
        reason: "invalid_folder",
      },
    });
    return errorResponse("Carpeta de upload inválida.", 400);
  }

  if (!isAllowedMarketingImageType(file.type)) {
    await logAuditEvent({
      actor: {
        userId: admin.sessionUser.id,
        role: admin.sessionUser.role,
      },
      action: "marketing.image.uploaded",
      resourceType: "marketing_image_upload",
      status: "failure",
      metadata: {
        reason: "invalid_mime_type",
        folder,
        mimeType: file.type,
      },
    });
    return errorResponse("Tipo de archivo no permitido. Usa JPEG, PNG o WEBP.", 400);
  }

  if (file.size <= 0 || file.size > MARKETING_IMAGE_MAX_BYTES) {
    await logAuditEvent({
      actor: {
        userId: admin.sessionUser.id,
        role: admin.sessionUser.role,
      },
      action: "marketing.image.uploaded",
      resourceType: "marketing_image_upload",
      status: "failure",
      metadata: {
        reason: "invalid_file_size",
        folder,
        mimeType: file.type,
        fileSize: file.size,
      },
    });
    return errorResponse(`Archivo demasiado grande. Máximo ${Math.floor(MARKETING_IMAGE_MAX_BYTES / 1024 / 1024)}MB.`, 400);
  }

  const sanitizedFilename = sanitizeMarketingImageFilename(file.name, file.type);
  const storageKey = buildMarketingImageStorageKey(folder, sanitizedFilename);

  try {
    const publicUrl = await uploadPublicMarketingImage(file, storageKey, file.type);
    await logAuditEvent({
      actor: {
        userId: admin.sessionUser.id,
        role: admin.sessionUser.role,
      },
      action: "marketing.image.uploaded",
      resourceType: "marketing_image_upload",
      resourceId: storageKey,
      targetLabel: sanitizedFilename,
      status: "success",
      metadata: {
        folder,
        mimeType: file.type,
        fileSize: file.size,
      },
    });
    return Response.json({ url: publicUrl, pathname: storageKey }, { status: 201 });
  } catch (error) {
    await logAuditEvent({
      actor: {
        userId: admin.sessionUser.id,
        role: admin.sessionUser.role,
      },
      action: "marketing.image.uploaded",
      resourceType: "marketing_image_upload",
      resourceId: storageKey,
      status: "failure",
      metadata: {
        folder,
        mimeType: file.type,
      },
    });
    logApiError(
      {
        event: "admin.marketing_image_upload_failed",
        route: "/api/admin/marketing-images/upload",
        userId: admin.sessionUser.id,
        metadata: {
          folder,
          mimeType: file.type,
          fileSize: file.size,
        },
      },
      error,
    );
    return internalServerErrorResponse("No se pudo subir la imagen. Intenta de nuevo.");
  }
}
