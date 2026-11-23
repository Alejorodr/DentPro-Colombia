-- DOG-11: índices compuestos para el contador de no leídas y el feed de notificaciones.
-- Reemplazan al índice simple de userId, que ambos cubren como prefijo.
DROP INDEX IF EXISTS "Notification_userId_idx";

CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
