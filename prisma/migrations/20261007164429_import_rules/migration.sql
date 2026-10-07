-- CreateTable
CREATE TABLE "VendorAlias" (
    "externalVendor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vendor" TEXT NOT NULL,

    CONSTRAINT "VendorAlias_pkey" PRIMARY KEY ("externalVendor")
);

-- CreateTable
CREATE TABLE "VendorRule" (
    "externalVendor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT,

    CONSTRAINT "VendorRule_pkey" PRIMARY KEY ("externalVendor")
);

-- CreateTable
CREATE TABLE "AmountRule" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalVendor" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "AmountRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmountRuleSplit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "amountRuleId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "AmountRuleSplit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AmountRule_externalVendor_amount_key" ON "AmountRule"("externalVendor", "amount");

-- CreateIndex
CREATE UNIQUE INDEX "AmountRuleSplit_amountRuleId_categoryId_key" ON "AmountRuleSplit"("amountRuleId", "categoryId");

-- AddForeignKey
ALTER TABLE "VendorRule" ADD CONSTRAINT "VendorRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmountRuleSplit" ADD CONSTRAINT "AmountRuleSplit_amountRuleId_fkey" FOREIGN KEY ("amountRuleId") REFERENCES "AmountRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmountRuleSplit" ADD CONSTRAINT "AmountRuleSplit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill
INSERT INTO "VendorAlias" ("externalVendor", "updatedAt", "vendor")
SELECT "externalVendor", CURRENT_TIMESTAMP, "vendor"
FROM "CategorizationRule"
WHERE "vendor" <> "externalVendor";

INSERT INTO "VendorRule" ("externalVendor", "updatedAt", "categoryId")
SELECT "externalVendor", CURRENT_TIMESTAMP, "categoryId"
FROM "CategorizationRule"
WHERE "categoryId" IS NOT NULL;

-- DropTable
ALTER TABLE "CategorizationRule" DROP CONSTRAINT "CategorizationRule_categoryId_fkey";
DROP TABLE "CategorizationRule";
