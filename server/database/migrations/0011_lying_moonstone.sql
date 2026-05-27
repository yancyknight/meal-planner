DROP INDEX `idx_freezer_items_standalone`;--> statement-breakpoint
ALTER TABLE `freezer_items` ADD `eligibleForPlanning` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_freezer_items_standalone` ON `freezer_items` (`targetUseDate`) WHERE status = 'active' AND dishId IS NULL AND eligibleForPlanning = 1;--> statement-breakpoint
ALTER TABLE `plan_entries` ADD `freezerItemId` integer REFERENCES freezer_items(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `idx_plan_entries_freezer_item_id` ON `plan_entries` (`freezerItemId`) WHERE freezerItemId IS NOT NULL;