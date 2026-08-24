CREATE TABLE `dish_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dishId` integer NOT NULL,
	`storedName` text NOT NULL,
	`originalName` text NOT NULL,
	`mimeType` text NOT NULL,
	`sizeBytes` integer NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`dishId`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_dish_files_dish_id` ON `dish_files` (`dishId`);