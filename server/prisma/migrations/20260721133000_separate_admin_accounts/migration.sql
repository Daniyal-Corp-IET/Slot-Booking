-- Store administrators separately from students.
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

INSERT INTO "admins" ("id", "email", "username", "password_hash", "created_at", "updated_at")
SELECT
    "id",
    COALESCE("email", LOWER("username") || '@local.invalid'),
    "username",
    "passwordHash",
    "createdAt",
    "updatedAt"
FROM "users"
WHERE "role" = 'ADMIN';

-- Keep each student's password with the student record.
ALTER TABLE "students" ADD COLUMN "password_hash" TEXT;

UPDATE "students"
SET "password_hash" = "users"."passwordHash"
FROM "users"
WHERE "students"."user_id" = "users"."id";

ALTER TABLE "students" ALTER COLUMN "password_hash" SET NOT NULL;
ALTER TABLE "students" DROP CONSTRAINT "students_user_id_fkey";
DROP INDEX "students_user_id_key";
ALTER TABLE "students" DROP COLUMN "user_id";

DROP TABLE "users";
DROP TYPE "UserRole";
