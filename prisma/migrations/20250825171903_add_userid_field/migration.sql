-- AlterTable
ALTER TABLE `User` ADD COLUMN `userId` VARCHAR(191) NOT NULL DEFAULT '';

-- Update existing records to set userId = email
UPDATE `User` SET `userId` = `email` WHERE `userId` = '';

-- CreateIndex
CREATE UNIQUE INDEX `User_userId_key` ON `User`(`userId`);

-- AlterTable
ALTER TABLE `RoomUser` DROP FOREIGN KEY `RoomUser_userId_fkey`;

-- AlterTable
ALTER TABLE `RoomUser` ADD CONSTRAINT `RoomUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE; 