CREATE TABLE `shopping_list_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shoppingListId` integer NOT NULL,
	`canonicalIngredientId` integer NOT NULL,
	`sourceDishIds` text DEFAULT '[]' NOT NULL,
	`rawTexts` text DEFAULT '[]' NOT NULL,
	`checked` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`shoppingListId`) REFERENCES `shopping_lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`canonicalIngredientId`) REFERENCES `canonical_ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_shopping_list_items_list_id` ON `shopping_list_items` (`shoppingListId`);--> statement-breakpoint
CREATE TABLE `shopping_lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`dateRangeStart` text NOT NULL,
	`dateRangeEnd` text NOT NULL,
	`isDone` integer DEFAULT 0 NOT NULL,
	`doneAt` text,
	`createdAt` text NOT NULL
);
