-- AlterTable: Add requirement field to Badge
ALTER TABLE "Badge" ADD COLUMN "requirement" TEXT NOT NULL DEFAULT '';
