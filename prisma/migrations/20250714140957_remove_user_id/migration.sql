/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `goldchip` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `silverchip` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `RoomUser` DROP FOREIGN KEY `RoomUser_userId_fkey`;

-- DropIndex
DROP INDEX `User_email_key` ON `User`;

-- AlterTable
ALTER TABLE `RoomUser` MODIFY `userId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `User` DROP PRIMARY KEY,
    DROP COLUMN `goldchip`,
    DROP COLUMN `id`,
    DROP COLUMN `silverchip`,
    ADD COLUMN `goldChip` INTEGER NOT NULL DEFAULT 1200,
    ADD COLUMN `silverChip` INTEGER NOT NULL DEFAULT 1200,
    ADD PRIMARY KEY (`email`);

-- AddForeignKey
ALTER TABLE `RoomUser` ADD CONSTRAINT `RoomUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`email`) ON DELETE RESTRICT ON UPDATE CASCADE;
