ALTER TABLE `dishes` RENAME COLUMN `allergens` TO `freeFrom`;--> statement-breakpoint
UPDATE `dishes` SET `freeFrom` = '[]';
