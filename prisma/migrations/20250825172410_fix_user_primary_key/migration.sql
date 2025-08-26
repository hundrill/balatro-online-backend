-- Drop foreign key constraint first
ALTER TABLE `RoomUser` DROP FOREIGN KEY `RoomUser_userId_fkey`;

-- Drop primary key from email
ALTER TABLE `User` DROP PRIMARY KEY;

-- Add primary key to userId
ALTER TABLE `User` ADD PRIMARY KEY (`userId`);

-- Make email nullable
ALTER TABLE `User` MODIFY `email` VARCHAR(191) NULL;

-- Add unique constraint to email
ALTER TABLE `User` ADD UNIQUE INDEX `User_email_key` (`email`);

-- Re-add foreign key constraint
ALTER TABLE `RoomUser` ADD CONSTRAINT `RoomUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE; 