CREATE TABLE "lab_policy" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "monthly_limit_minutes" INTEGER NOT NULL DEFAULT 2100,
    "daily_limit_minutes" INTEGER NOT NULL DEFAULT 300,
    "booking_increment_minutes" INTEGER NOT NULL DEFAULT 15,
    "min_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "max_duration_minutes" INTEGER NOT NULL DEFAULT 180,
    "open_minutes" INTEGER NOT NULL DEFAULT 540,
    "close_minutes" INTEGER NOT NULL DEFAULT 1080,
    "cancel_before_minutes" INTEGER NOT NULL DEFAULT 0,
    "sunday_holiday" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_policy_pkey" PRIMARY KEY ("id")
);

INSERT INTO "lab_policy" ("id", "updated_at") VALUES (1, CURRENT_TIMESTAMP);
