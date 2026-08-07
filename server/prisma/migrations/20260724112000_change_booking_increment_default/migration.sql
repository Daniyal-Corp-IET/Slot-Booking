ALTER TABLE "lab_policy"
ALTER COLUMN "booking_increment_minutes" SET DEFAULT 10;

UPDATE "lab_policy"
SET "booking_increment_minutes" = 10
WHERE "id" = 1;
