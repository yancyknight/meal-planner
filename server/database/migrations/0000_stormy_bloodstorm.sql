CREATE TABLE `dishes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`imageUrl` text,
	`imageLocalPath` text,
	`timeEstimateMinutes` integer,
	`yieldServings` integer,
	`sourceUrl` text,
	`sourceName` text,
	`difficulty` text,
	`allergens` text DEFAULT '[]' NOT NULL,
	`season` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`weight` integer DEFAULT 50 NOT NULL,
	`minIntervalDays` integer,
	`archived` integer DEFAULT false NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_dishes_archived` ON `dishes` (`archived`);