CREATE TABLE `dish_cooldowns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dishId` integer NOT NULL,
	`endsAt` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`dishId`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dish_cooldowns_dishId_unique` ON `dish_cooldowns` (`dishId`);