ALTER TABLE `sales` ADD `item_name` text DEFAULT 'Unknown Item' NOT NULL;--> statement-breakpoint
ALTER TABLE `sales` ADD `quantity` integer DEFAULT 1 NOT NULL;