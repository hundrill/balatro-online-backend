/*
  Warnings:

  - You are about to drop the column `timing_after_scoring` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `timing_draw` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `timing_fold` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `timing_hand_play` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `timing_planet_card_use` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `timing_round_clear` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `timing_round_start` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `timing_scoring` on the `SpecialCard` table. All the data in the column will be lost.
  - You are about to drop the column `timing_tarot_card_use` on the `SpecialCard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `SpecialCard` DROP COLUMN `timing_after_scoring`,
    DROP COLUMN `timing_draw`,
    DROP COLUMN `timing_fold`,
    DROP COLUMN `timing_hand_play`,
    DROP COLUMN `timing_planet_card_use`,
    DROP COLUMN `timing_round_clear`,
    DROP COLUMN `timing_round_start`,
    DROP COLUMN `timing_scoring`,
    DROP COLUMN `timing_tarot_card_use`;
