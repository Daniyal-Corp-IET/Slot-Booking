CREATE OR REPLACE FUNCTION prevent_booking_outage_overlap()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(1, NEW."system_number");

    IF NEW."status" <> 'CANCELLED'::"BookingStatus" AND EXISTS (
        SELECT 1
        FROM "system_outages"
        WHERE "system_number" = NEW."system_number"
          AND tsrange("starts_at", COALESCE("ends_at", 'infinity'::timestamp), '[)')
              && tsrange(NEW."starts_at", NEW."ends_at", '[)')
    ) THEN
        RAISE EXCEPTION 'The system is unavailable during this booking.' USING ERRCODE = '23P01';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_outage_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(1, NEW."system_number");

    IF EXISTS (
        SELECT 1
        FROM "bookings"
        WHERE "system_number" = NEW."system_number"
          AND "status" <> 'CANCELLED'::"BookingStatus"
          AND tsrange("starts_at", "ends_at", '[)')
              && tsrange(NEW."starts_at", COALESCE(NEW."ends_at", 'infinity'::timestamp), '[)')
    ) THEN
        RAISE EXCEPTION 'This unavailable period overlaps a booking.' USING ERRCODE = '23P01';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "bookings_check_system_outages"
BEFORE INSERT OR UPDATE OF "system_number", "starts_at", "ends_at", "status"
ON "bookings"
FOR EACH ROW EXECUTE FUNCTION prevent_booking_outage_overlap();

CREATE TRIGGER "outages_check_system_bookings"
BEFORE INSERT OR UPDATE OF "system_number", "starts_at", "ends_at"
ON "system_outages"
FOR EACH ROW EXECUTE FUNCTION prevent_outage_booking_overlap();
