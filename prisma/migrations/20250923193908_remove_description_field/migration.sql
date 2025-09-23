-- DropIndex
DROP INDEX `SpecialCard_id_key` ON `SpecialCard`;

-- AlterTable
ALTER TABLE `SpecialCard` DROP COLUMN `description`;

-- CreateIndex
CREATE UNIQUE INDEX `SpecialCard_id_key` ON `SpecialCard`(`id`);
