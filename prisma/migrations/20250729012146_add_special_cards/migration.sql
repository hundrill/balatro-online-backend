-- CreateTable
CREATE TABLE `SpecialCard` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` INTEGER NOT NULL DEFAULT 0,
    `basevalue` DOUBLE NULL DEFAULT 0,
    `increase` DOUBLE NULL DEFAULT 0,
    `decrease` DOUBLE NULL DEFAULT 0,
    `maxvalue` INTEGER NULL DEFAULT 0,
    `need_card_count` INTEGER NULL DEFAULT 0,
    `enhanceChips` INTEGER NULL DEFAULT 0,
    `enhanceMul` DOUBLE NULL DEFAULT 0,
    `timing_draw` VARCHAR(191) NULL,
    `timing_round_start` VARCHAR(191) NULL,
    `timing_hand_play` VARCHAR(191) NULL,
    `timing_scoring` VARCHAR(191) NULL,
    `timing_after_scoring` VARCHAR(191) NULL,
    `timing_fold` VARCHAR(191) NULL,
    `timing_round_clear` VARCHAR(191) NULL,
    `timing_tarot_card_use` VARCHAR(191) NULL,
    `timing_planet_card_use` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SpecialCard_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
