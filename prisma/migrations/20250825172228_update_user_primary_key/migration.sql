-- Drop existing foreign key constraints
ALTER TABLE `RoomUser` DROP FOREIGN KEY `RoomUser_userId_fkey`;

-- Drop primary key constraint from email
ALTER TABLE `User` DROP PRIMARY KEY;

-- Add primary key constraint to userId
ALTER TABLE `User` ADD PRIMARY KEY (`userId`);

-- Make email nullable and add unique constraint
ALTER TABLE `User` MODIFY `email` VARCHAR(191) NULL;
ALTER TABLE `User` ADD UNIQUE INDEX `User_email_key` (`email`);

-- Add foreign key constraint back to userId
ALTER TABLE `RoomUser` ADD CONSTRAINT `RoomUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE; 