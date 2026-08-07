CREATE TABLE "systems" (
    "system_number" SERIAL NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("system_number")
);

CREATE TABLE "system_outages" (
    "id" TEXT NOT NULL,
    "system_number" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_outages_pkey" PRIMARY KEY ("id")
);

INSERT INTO "systems" ("system_number")
SELECT generate_series(1, 25);

SELECT setval(pg_get_serial_sequence('systems', 'system_number'), 25, true);

CREATE INDEX "system_outages_system_number_starts_at_idx"
ON "system_outages"("system_number", "starts_at");

ALTER TABLE "system_outages"
ADD CONSTRAINT "system_outages_system_number_fkey"
FOREIGN KEY ("system_number") REFERENCES "systems"("system_number")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bookings"
ADD CONSTRAINT "bookings_system_number_fkey"
FOREIGN KEY ("system_number") REFERENCES "systems"("system_number")
ON DELETE RESTRICT ON UPDATE CASCADE;
