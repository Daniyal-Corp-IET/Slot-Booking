-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "students" (
    "student_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "program_start" DATE NOT NULL,
    "program_end" DATE NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "monthly_limit_minutes" INTEGER NOT NULL DEFAULT 2100,
    "course_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "system_number" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "booked_minutes" INTEGER NOT NULL,
    "used_minutes" INTEGER,
    "status" "BookingStatus" NOT NULL DEFAULT 'UPCOMING',
    "ended_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE INDEX "students_course_id_idx" ON "students"("course_id");

-- CreateIndex
CREATE INDEX "bookings_student_id_starts_at_idx" ON "bookings"("student_id", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_system_number_starts_at_idx" ON "bookings"("system_number", "starts_at");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;
