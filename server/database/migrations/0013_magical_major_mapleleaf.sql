CREATE TABLE `pending_recipe_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`resultJson` text NOT NULL,
	`createdAt` text NOT NULL
);
