/*
  Warnings:

  - You are about to drop the column `priority` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the column `respondedAt` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the column `respondedBy` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the column `response` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Feedback` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Feedback_id_key` ON `Feedback`;

-- AlterTable
ALTER TABLE `Feedback` DROP COLUMN `priority`,
    DROP COLUMN `respondedAt`,
    DROP COLUMN `respondedBy`,
    DROP COLUMN `response`,
    DROP COLUMN `status`,
    DROP COLUMN `title`,
    ADD COLUMN `parentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Feedback_parentId_idx` ON `Feedback`(`parentId`);

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Feedback`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
