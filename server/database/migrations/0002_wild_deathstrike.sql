CREATE TABLE `canonical_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`walmartUrl` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `canonical_ingredients_name_unique` ON `canonical_ingredients` (`name`);--> statement-breakpoint
CREATE INDEX `idx_canonical_ingredients_name` ON `canonical_ingredients` (`name`);--> statement-breakpoint
CREATE TABLE `dish_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dishId` integer NOT NULL,
	`canonicalIngredientId` integer NOT NULL,
	`rawText` text NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`dishId`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`canonicalIngredientId`) REFERENCES `canonical_ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_dish_ingredients_dish_id` ON `dish_ingredients` (`dishId`);--> statement-breakpoint
CREATE INDEX `idx_dish_ingredients_canonical_id` ON `dish_ingredients` (`canonicalIngredientId`);