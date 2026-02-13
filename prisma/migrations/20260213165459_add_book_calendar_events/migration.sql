-- CreateTable
CREATE TABLE "BookCalendarEvent" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookCalendarEvent_bookId_idx" ON "BookCalendarEvent"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "BookCalendarEvent_bookId_date_key" ON "BookCalendarEvent"("bookId", "date");

-- AddForeignKey
ALTER TABLE "BookCalendarEvent" ADD CONSTRAINT "BookCalendarEvent_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
