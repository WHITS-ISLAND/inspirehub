-- Create "interested" table
CREATE TABLE `interested` (
  `node_id` text NOT NULL,
  `user_id` text NOT NULL,
  `created_at` text NOT NULL,
  PRIMARY KEY (`node_id`, `user_id`),
  CONSTRAINT `0` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`node_id`) REFERENCES `nodes` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_interested_node_id" to table: "interested"
CREATE INDEX `idx_interested_node_id` ON `interested` (`node_id`);
-- Create index "idx_interested_user_id" to table: "interested"
CREATE INDEX `idx_interested_user_id` ON `interested` (`user_id`);
-- Create index "idx_interested_created_at" to table: "interested"
CREATE INDEX `idx_interested_created_at` ON `interested` (`created_at`);
-- Create "want_to_try" table
CREATE TABLE `want_to_try` (
  `node_id` text NOT NULL,
  `user_id` text NOT NULL,
  `created_at` text NOT NULL,
  PRIMARY KEY (`node_id`, `user_id`),
  CONSTRAINT `0` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`node_id`) REFERENCES `nodes` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_want_to_try_node_id" to table: "want_to_try"
CREATE INDEX `idx_want_to_try_node_id` ON `want_to_try` (`node_id`);
-- Create index "idx_want_to_try_user_id" to table: "want_to_try"
CREATE INDEX `idx_want_to_try_user_id` ON `want_to_try` (`user_id`);
-- Create index "idx_want_to_try_created_at" to table: "want_to_try"
CREATE INDEX `idx_want_to_try_created_at` ON `want_to_try` (`created_at`);
