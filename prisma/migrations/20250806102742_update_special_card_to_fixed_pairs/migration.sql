/*
  Warnings:

  - You are about to drop the column `conditionNumericValues` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `conditionOperators` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `conditionTypes` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `conditionValues` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `effectOnCards` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `effectTimings` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `effectTypes` on the `SpecialCard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `SpecialCard` DROP COLUMN `conditionNumericValues`,
    DROP COLUMN `conditionOperators`,
    DROP COLUMN `conditionTypes`,
    DROP COLUMN `conditionValues`,
    DROP COLUMN `effectOnCards`,
    DROP COLUMN `effectTimings`,
    DROP COLUMN `effectTypes`,
    ADD COLUMN `conditionNumeric1` INTEGER NULL,
    ADD COLUMN `conditionNumeric2` INTEGER NULL,
    ADD COLUMN `conditionOperator1` VARCHAR(191) NULL,
    ADD COLUMN `conditionOperator2` VARCHAR(191) NULL,
    ADD COLUMN `conditionType1` VARCHAR(191) NULL,
    ADD COLUMN `conditionType2` VARCHAR(191) NULL,
    ADD COLUMN `conditionValue1` VARCHAR(191) NULL,
    ADD COLUMN `conditionValue2` VARCHAR(191) NULL,
    ADD COLUMN `effectType1` VARCHAR(191) NULL,
    ADD COLUMN `effectType2` VARCHAR(191) NULL,
    ADD COLUMN `effectValue1` DOUBLE NULL,
    ADD COLUMN `effectValue2` DOUBLE NULL;
