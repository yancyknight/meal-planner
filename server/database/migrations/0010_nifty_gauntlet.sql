CREATE TABLE `freezer_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`defaultLifetimeDays` integer NOT NULL,
	`isSystem` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `freezer_categories_name_unique` ON `freezer_categories` (`name`);--> statement-breakpoint
CREATE TABLE `freezer_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`freezerId` integer NOT NULL,
	`categoryId` integer NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`dishId` integer,
	`canonicalIngredientId` integer,
	`addedAt` text NOT NULL,
	`lifetimeDaysOverride` integer,
	`tossByDate` text NOT NULL,
	`targetUseDate` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`statusChangedAt` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`freezerId`) REFERENCES `freezers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`categoryId`) REFERENCES `freezer_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dishId`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`canonicalIngredientId`) REFERENCES `canonical_ingredients`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_freezer_items_freezer_id` ON `freezer_items` (`freezerId`);--> statement-breakpoint
CREATE INDEX `idx_freezer_items_status` ON `freezer_items` (`status`);--> statement-breakpoint
CREATE INDEX `idx_freezer_items_toss_by` ON `freezer_items` (`tossByDate`) WHERE status = 'active';--> statement-breakpoint
CREATE INDEX `idx_freezer_items_dish_id` ON `freezer_items` (`dishId`) WHERE status = 'active' AND dishId IS NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_freezer_items_standalone` ON `freezer_items` (`targetUseDate`) WHERE status = 'active' AND dishId IS NULL;--> statement-breakpoint
CREATE TABLE `freezers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`lastAuditedAt` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
