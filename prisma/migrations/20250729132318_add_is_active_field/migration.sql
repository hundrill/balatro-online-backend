/*
  Warnings:

  - You are about to drop the column `cardVersion` on the `SpecialCard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `SpecialCard` DROP COLUMN `cardVersion`,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;
