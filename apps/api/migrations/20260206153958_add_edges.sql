-- Create "edges" table
CREATE TABLE `edges` (
  `id` text NULL,
  `source` text NOT NULL,
  `target` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `0` FOREIGN KEY (`target`) REFERENCES `nodes` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`source`) REFERENCES `nodes` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
