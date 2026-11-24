-- CreateTable
CREATE TABLE "BusinessHours" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "timeZone" TEXT NOT NULL,
    "intervals" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessHoursOverride" (
    "id" SERIAL NOT NULL,
    "businessHoursId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "intervals" JSONB NOT NULL,
    CONSTRAINT "BusinessHoursOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessHours_userId_key" ON "BusinessHours"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessHoursOverride_businessHoursId_date_key" ON "BusinessHoursOverride"("businessHoursId", "date");

-- AddForeignKey
ALTER TABLE "BusinessHours" ADD CONSTRAINT "BusinessHours_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessHoursOverride" ADD CONSTRAINT "BusinessHoursOverride_businessHoursId_fkey" FOREIGN KEY ("businessHoursId") REFERENCES "BusinessHours"("id") ON DELETE CASCADE ON UPDATE CASCADE;
