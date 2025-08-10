-- AlterTable
ALTER TABLE `SpecialCard` ADD COLUMN `conditionNumericValues` TEXT NULL,
    ADD COLUMN `conditionOperators` TEXT NULL,
    ADD COLUMN `conditionTypes` TEXT NULL,
    ADD COLUMN `conditionValues` TEXT NULL,
    ADD COLUMN `effectOnCards` TEXT NULL,
    ADD COLUMN `effectTimings` TEXT NULL,
    ADD COLUMN `effectTypes` TEXT NULL;
