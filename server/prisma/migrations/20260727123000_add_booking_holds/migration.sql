CREATE TABLE "booking_holds" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "system_number" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_holds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booking_holds_student_id_key"
ON "booking_holds"("student_id");

CREATE INDEX "booking_holds_system_number_starts_at_ends_at_idx"
ON "booking_holds"("system_number", "starts_at", "ends_at");

CREATE INDEX "booking_holds_expires_at_idx"
ON "booking_holds"("expires_at");

ALTER TABLE "booking_holds"
ADD CONSTRAINT "booking_holds_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "students"("student_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_holds"
ADD CONSTRAINT "booking_holds_system_number_fkey"
FOREIGN KEY ("system_number") REFERENCES "systems"("system_number")
ON DELETE CASCADE ON UPDATE CASCADE;
