-- Create "nodes" table
CREATE TABLE `nodes` (
  `id` text NULL,
  `type` text NOT NULL,
  `title` text NOT NULL,
  `content` text NOT NULL,
  `author_id` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `0` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CHECK (
    type = 'issue' OR
    type = 'idea' OR
    type = 'project'
  )
);
-- Create index "idx_nodes_author_id" to table: "nodes"
CREATE INDEX `idx_nodes_author_id` ON `nodes` (`author_id`);
-- Create index "idx_nodes_type" to table: "nodes"
CREATE INDEX `idx_nodes_type` ON `nodes` (`type`);
-- Create index "idx_nodes_created_at" to table: "nodes"
CREATE INDEX `idx_nodes_created_at` ON `nodes` (`created_at`);
-- Create index "idx_nodes_updated_at" to table: "nodes"
CREATE INDEX `idx_nodes_updated_at` ON `nodes` (`updated_at`);
-- Create index "idx_nodes_type_created_at" to table: "nodes"
CREATE INDEX `idx_nodes_type_created_at` ON `nodes` (`type`, `created_at`);
-- Create index "idx_nodes_author_type" to table: "nodes"
CREATE INDEX `idx_nodes_author_type` ON `nodes` (`author_id`, `type`);
-- Create "tags" table
CREATE TABLE `tags` (
  `id` text NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL,
  PRIMARY KEY (`id`)
);
-- Create index "tags_name" to table: "tags"
CREATE UNIQUE INDEX `tags_name` ON `tags` (`name`);
-- Create index "idx_tags_name" to table: "tags"
CREATE INDEX `idx_tags_name` ON `tags` (`name`);
-- Create "node_tags" table
CREATE TABLE `node_tags` (
  `node_id` text NOT NULL,
  `tag_id` text NOT NULL,
  `created_at` text NOT NULL,
  PRIMARY KEY (`node_id`, `tag_id`),
  CONSTRAINT `0` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`node_id`) REFERENCES `nodes` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_node_tags_node_id" to table: "node_tags"
CREATE INDEX `idx_node_tags_node_id` ON `node_tags` (`node_id`);
-- Create index "idx_node_tags_tag_id" to table: "node_tags"
CREATE INDEX `idx_node_tags_tag_id` ON `node_tags` (`tag_id`);
-- Create "comments" table
CREATE TABLE `comments` (
  `id` text NULL,
  `node_id` text NOT NULL,
  `parent_id` text NULL,
  `author_id` text NOT NULL,
  `content` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `0` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`node_id`) REFERENCES `nodes` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_comments_node_id" to table: "comments"
CREATE INDEX `idx_comments_node_id` ON `comments` (`node_id`);
-- Create index "idx_comments_parent_id" to table: "comments"
CREATE INDEX `idx_comments_parent_id` ON `comments` (`parent_id`);
-- Create index "idx_comments_author_id" to table: "comments"
CREATE INDEX `idx_comments_author_id` ON `comments` (`author_id`);
-- Create index "idx_comments_created_at" to table: "comments"
CREATE INDEX `idx_comments_created_at` ON `comments` (`created_at`);
-- Create "comment_mentions" table
CREATE TABLE `comment_mentions` (
  `comment_id` text NOT NULL,
  `mentioned_user_id` text NOT NULL,
  `created_at` text NOT NULL,
  PRIMARY KEY (`comment_id`, `mentioned_user_id`),
  CONSTRAINT `0` FOREIGN KEY (`mentioned_user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_comment_mentions_user_id" to table: "comment_mentions"
CREATE INDEX `idx_comment_mentions_user_id` ON `comment_mentions` (`mentioned_user_id`);
-- Create index "idx_comment_mentions_comment_id" to table: "comment_mentions"
CREATE INDEX `idx_comment_mentions_comment_id` ON `comment_mentions` (`comment_id`);
-- Create "likes" table
CREATE TABLE `likes` (
  `node_id` text NOT NULL,
  `user_id` text NOT NULL,
  `created_at` text NOT NULL,
  PRIMARY KEY (`node_id`, `user_id`),
  CONSTRAINT `0` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`node_id`) REFERENCES `nodes` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_likes_node_id" to table: "likes"
CREATE INDEX `idx_likes_node_id` ON `likes` (`node_id`);
-- Create index "idx_likes_user_id" to table: "likes"
CREATE INDEX `idx_likes_user_id` ON `likes` (`user_id`);
-- Create index "idx_likes_created_at" to table: "likes"
CREATE INDEX `idx_likes_created_at` ON `likes` (`created_at`);
