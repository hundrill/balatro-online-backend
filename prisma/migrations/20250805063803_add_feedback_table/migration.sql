/*
  Warnings:

  - You are about to drop the column `category` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the `FeedbackReply` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `FeedbackReply` DROP FOREIGN KEY `FeedbackReply_feedbackId_fkey`;

-- DropIndex
DROP INDEX `Feedback_category_key` ON `Feedback`;

-- DropIndex
DROP INDEX `Feedback_createdAt_key` ON `Feedback`;

-- DropIndex
DROP INDEX `Feedback_priority_key` ON `Feedback`;

-- DropIndex
DROP INDEX `Feedback_status_key` ON `Feedback`;

-- AlterTable
ALTER TABLE `Feedback` DROP COLUMN `category`,
    ADD COLUMN `respondedAt` DATETIME(3) NULL,
    ADD COLUMN `respondedBy` VARCHAR(191) NULL,
    ADD COLUMN `response` TEXT NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'pending';

-- DropTable
DROP TABLE `FeedbackReply`;

-- CreateIndex
CREATE INDEX `Feedback_id_key` ON `Feedback`(`id`);
