CREATE TABLE `plan_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`mealType` text NOT NULL,
	`entryKind` text DEFAULT 'fresh' NOT NULL,
	`dishId` integer,
	`oneOffText` text,
	`guestCount` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`dishId`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_plan_entries_date` ON `plan_entries` (`date`);--> statement-breakpoint
CREATE INDEX `idx_plan_entries_dish_id` ON `plan_entries` (`dishId`);--> statement-breakpoint
CREATE INDEX `idx_plan_entries_dish_fresh` ON `plan_entries` (`dishId`,`date`) WHERE entryKind = 'fresh';