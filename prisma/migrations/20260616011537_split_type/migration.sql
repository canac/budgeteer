-- AlterTable
ALTER TABLE "Category"
ADD COLUMN     "accumulating" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flexible" BOOLEAN NOT NULL DEFAULT true;

-- Migrate existing data
UPDATE "Category" SET "accumulating" = true, "flexible" = false WHERE "type" = 'SAVINGS';
UPDATE "Category" SET "accumulating" = true, "flexible" = true WHERE "type" = 'ACCUMULATING';
UPDATE "Category" SET "accumulating" = false, "flexible" = true WHERE "type" = 'NON_ACCUMULATING';

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "type";

-- DropEnum
DROP TYPE "CategoryType";
