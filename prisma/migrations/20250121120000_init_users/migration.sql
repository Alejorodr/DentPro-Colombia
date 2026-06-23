-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "primary_role_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_primary_role_id_check" CHECK ("primary_role_id" IN ('patient', 'professional', 'reception', 'admin'))
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
