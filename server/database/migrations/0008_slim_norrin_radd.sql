CREATE TABLE `planning_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`weekStart` text NOT NULL,
	`mealTypes` text DEFAULT '["dinner"]' NOT NULL,
	`currentStep` integer DEFAULT 1 NOT NULL,
	`slotStates` text DEFAULT '{}' NOT NULL,
	`removedPlanEntryIds` text DEFAULT '[]' NOT NULL,
	`pendingOneOffEntries` text DEFAULT '[]' NOT NULL,
	`sessionVirtualTags` text DEFAULT '[]' NOT NULL,
	`pinnedTags` text DEFAULT '[]' NOT NULL,
	`wishlistTags` text DEFAULT '[]' NOT NULL,
	`draftPlan` text DEFAULT '{}' NOT NULL,
	`shownDishIdsBySlot` text DEFAULT '{}' NOT NULL,
	`leftoverToggles` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
