-- Give administrators a full name and an optional phone number.
ALTER TABLE "admins" ADD COLUMN "full_name" TEXT;
ALTER TABLE "admins" ADD COLUMN "phone_number" TEXT;

UPDATE "admins" SET "full_name" = "username" WHERE "full_name" IS NULL;

ALTER TABLE "admins" ALTER COLUMN "full_name" SET NOT NULL;
