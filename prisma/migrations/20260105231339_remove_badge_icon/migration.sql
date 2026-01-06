/*
  Warnings:

  - You are about to drop the column `icon` on the `Badge` table. All the data in the column will be lost.
  - You are about to drop the column `averageRating` on the `Prophecy` table. All the data in the column will be lost.
  - You are about to drop the column `ratingCount` on the `Prophecy` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Badge" DROP COLUMN "icon";

-- AlterTable
ALTER TABLE "Prophecy" DROP COLUMN "averageRating",
DROP COLUMN "ratingCount";

DELETE FROM "Badge" WHERE key = 'special_comeback';