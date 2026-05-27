PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_shopping_list_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shoppingListId` integer NOT NULL,
	`canonicalIngredientId` integer,
	`sourceDishIds` text DEFAULT '[]' NOT NULL,
	`rawTexts` text DEFAULT '[]' NOT NULL,
	`checked` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`shoppingListId`) REFERENCES `shopping_lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`canonicalIngredientId`) REFERENCES `canonical_ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_shopping_list_items`("id", "shoppingListId", "canonicalIngredientId", "sourceDishIds", "rawTexts", "checked") SELECT "id", "shoppingListId", "canonicalIngredientId", "sourceDishIds", "rawTexts", "checked" FROM `shopping_list_items`;--> statement-breakpoint
DROP TABLE `shopping_list_items`;--> statement-breakpoint
ALTER TABLE `__new_shopping_list_items` RENAME TO `shopping_list_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_shopping_list_items_list_id` ON `shopping_list_items` (`shoppingListId`);