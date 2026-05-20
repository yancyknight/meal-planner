ALTER TABLE `dishes` ADD `cooldownDays` integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE `dishes` ADD `targetIntervalDays` integer DEFAULT 14 NOT NULL;--> statement-breakpoint
ALTER TABLE `dishes` ADD `excludedFromSuggestions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `dishes` DROP COLUMN `weight`;--> statement-breakpoint
ALTER TABLE `dishes` DROP COLUMN `minIntervalDays`;
