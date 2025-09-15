/*
  Warnings:

  - You are about to alter the column `effectValue1` on the `SpecialCard` table. The data in that column could be lost. The data in that column will be cast from `Double` to `VarChar(191)`.
  - You are about to alter the column `effectValue2` on the `SpecialCard` table. The data in that column could be lost. The data in that column will be cast from `Double` to `VarChar(191)`.
  - You are about to alter the column `effectValue3` on the `SpecialCard` table. The data in that column could be lost. The data in that column will be cast from `Double` to `VarChar(191)`.
  - You are about to alter the column `effectValue4` on the `SpecialCard` table. The data in that column could be lost. The data in that column will be cast from `Double` to `VarChar(191)`.
  - You are about to alter the column `effectValue5` on the `SpecialCard` table. The data in that column could be lost. The data in that column will be cast from `Double` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `SpecialCard` MODIFY `effectValue1` VARCHAR(191) NULL,
    MODIFY `effectValue2` VARCHAR(191) NULL,
    MODIFY `effectValue3` VARCHAR(191) NULL,
    MODIFY `effectValue4` VARCHAR(191) NULL,
    MODIFY `effectValue5` VARCHAR(191) NULL;
