ALTER TABLE `playlists` ADD `system_key` text;
--> statement-breakpoint
ALTER TABLE `playlists` ADD `sync_id` text;
--> statement-breakpoint
UPDATE `playlists` SET `sync_id` = lower(hex(randomblob(16)));
--> statement-breakpoint
UPDATE `playlists` SET `system_key` = 'liked', `description` = NULL WHERE `id` = (SELECT MIN(`id`) FROM `playlists` WHERE `type` = 'local' AND `description` = 'bilimusic:system:liked:v1');
--> statement-breakpoint
CREATE UNIQUE INDEX `playlists_system_key_unique` ON `playlists` (`system_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `playlists_sync_id_unique` ON `playlists` (`sync_id`);
