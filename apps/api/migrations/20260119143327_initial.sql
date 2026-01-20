-- Create "users" table
CREATE TABLE `users` (
  `id` text NULL,
  `google_id` text NOT NULL,
  `email` text NOT NULL,
  `name` text NOT NULL,
  `picture` text NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  PRIMARY KEY (`id`)
);
-- Create index "users_google_id" to table: "users"
CREATE UNIQUE INDEX `users_google_id` ON `users` (`google_id`);
-- Create index "users_email" to table: "users"
CREATE UNIQUE INDEX `users_email` ON `users` (`email`);
-- Create index "idx_users_email" to table: "users"
CREATE INDEX `idx_users_email` ON `users` (`email`);
-- Create index "idx_users_google_id" to table: "users"
CREATE INDEX `idx_users_google_id` ON `users` (`google_id`);
-- Create "refresh_token_families" table
CREATE TABLE `refresh_token_families` (
  `id` text NULL,
  `user_id` text NOT NULL,
  `current_token_jti` text NOT NULL,
  `is_revoked` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `0` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_refresh_token_families_user_id" to table: "refresh_token_families"
CREATE INDEX `idx_refresh_token_families_user_id` ON `refresh_token_families` (`user_id`);
-- Create index "idx_refresh_token_families_jti" to table: "refresh_token_families"
CREATE INDEX `idx_refresh_token_families_jti` ON `refresh_token_families` (`current_token_jti`);
