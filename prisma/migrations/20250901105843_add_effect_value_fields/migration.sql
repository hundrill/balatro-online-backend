-- DropIndex
DROP INDEX `User_userId_key` ON `User`;

-- AlterTable
ALTER TABLE `SpecialCard` ADD COLUMN `effectValue1` DOUBLE NULL,
    ADD COLUMN `effectValue2` DOUBLE NULL;

-- AlterTable
ALTER TABLE `User` ALTER COLUMN `userId` DROP DEFAULT;
