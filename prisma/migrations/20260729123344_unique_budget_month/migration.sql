/*
  Warnings:

  - A unique constraint covering the columns `[month]` on the table `Budget` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Budget_month_key" ON "Budget"("month");
