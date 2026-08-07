ALTER TABLE "bookings" ADD COLUMN "reference" TEXT;
ALTER TABLE "bookings" ADD COLUMN "ends_at" TIMESTAMP(3);

UPDATE "bookings"
SET
    "reference" = 'BK-' || UPPER(SUBSTRING(REPLACE("id", '-', ''), 1, 10)),
    "ends_at" = "starts_at" + ("booked_minutes" * INTERVAL '1 minute');

ALTER TABLE "bookings" ALTER COLUMN "reference" SET NOT NULL;
ALTER TABLE "bookings" ALTER COLUMN "ends_at" SET NOT NULL;

CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference");
CREATE INDEX "bookings_status_starts_at_idx" ON "bookings"("status", "starts_at");

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_system_overlap"
EXCLUDE USING GIST (
    "system_number" WITH =,
    tsrange("starts_at", "ends_at", '[)') WITH &&
)
WHERE ("status" <> 'CANCELLED'::"BookingStatus");
