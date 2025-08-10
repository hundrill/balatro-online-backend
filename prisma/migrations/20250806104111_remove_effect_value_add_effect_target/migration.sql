/*
  Warnings:

  - You are about to drop the column `effectValue1` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `effectValue2` on the `SpecialCard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `SpecialCard` DROP COLUMN `effectValue1`,
    DROP COLUMN `effectValue2`,
    ADD COLUMN `effectTarget1` VARCHAR(191) NULL,
    ADD COLUMN `effectTarget2` VARCHAR(191) NULL;
