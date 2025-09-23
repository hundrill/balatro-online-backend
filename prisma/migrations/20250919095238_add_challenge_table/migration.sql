-- AlterTable
ALTER TABLE `User` ADD COLUMN `challengeProgress` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Challenge` (
    `id` VARCHAR(191) NOT NULL,
    `nameKo` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `nameId` VARCHAR(191) NOT NULL,
    `descriptionKo` TEXT NULL,
    `descriptionEn` TEXT NULL,
    `descriptionId` TEXT NULL,
    `targetCount` INTEGER NOT NULL DEFAULT 0,
    `reward` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Challenge_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
