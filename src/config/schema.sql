-- Active: 1758704013034@@127.0.0.1@3306@taskmgmt
-- schema.sql
-- DB: taskmgmt
-- Created for development: full schema (users, profiles, tasks, templates, assignments, completions, week offs, posts, remarks)
-- NOTE: Run on a dev DB and verify before applying to production.

-- ======================
-- Create DB and user
-- ======================
CREATE DATABASE IF NOT EXISTS taskmgmt
  CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

USE taskmgmt;

CREATE USER IF NOT EXISTS 'user_tms'@'%' IDENTIFIED BY '269608Raj$';
GRANT ALL PRIVILEGES ON taskmgmt.* TO 'user_tms'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;

-- ======================
-- Table: users
-- ======================
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `username` VARCHAR(255) NULL UNIQUE,
  `fullname` VARCHAR(100) NULL,
  -- `initials` VARCHAR(25) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `user_role` ENUM('admin','manager','user') NOT NULL DEFAULT 'user',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`user_role`)
);

-- ======================
-- Table: user_profile (one-to-one with users)
-- ======================
CREATE TABLE IF NOT EXISTS `user_profile` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `phone` VARCHAR(30) NULL,
  `address_line1` VARCHAR(255) NULL,
  `address_line2` VARCHAR(255) NULL,
  `city` VARCHAR(100) NULL,
  `state` VARCHAR(100) NULL,
  `zipcode` VARCHAR(20) NULL,
  `profile_image_url` VARCHAR(512) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_user_profile_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- ======================
-- Table: user_week_offs (normalized week-offs, up to 2 enforced by triggers)
-- ======================
CREATE TABLE IF NOT EXISTS `user_week_offs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `week_day` ENUM('mon','tue','wed','thu','fri','sat','sun') NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_uwo_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `ux_user_weekday` (`user_id`, `week_day`),
  INDEX `idx_uwo_user` (`user_id`),
  INDEX `idx_uwo_weekday` (`week_day`)
);

-- Triggers for user_week_offs to enforce max 2 week-offs per user
DROP TRIGGER IF EXISTS `trg_user_weekoffs_before_insert`;
DROP TRIGGER IF EXISTS `trg_user_weekoffs_before_update`;

DELIMITER $$
CREATE TRIGGER `trg_user_weekoffs_before_insert`
BEFORE INSERT ON `user_week_offs`
FOR EACH ROW
BEGIN
  DECLARE cnt INT DEFAULT 0;
  SELECT COUNT(*) INTO cnt FROM user_week_offs WHERE user_id = NEW.user_id;
  IF cnt >= 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A user can have at most 2 week offs';
  END IF;
END$$

CREATE TRIGGER `trg_user_weekoffs_before_update`
BEFORE UPDATE ON `user_week_offs`
FOR EACH ROW
BEGIN
  DECLARE cnt INT DEFAULT 0;
  SELECT COUNT(*) INTO cnt
    FROM user_week_offs
   WHERE user_id = NEW.user_id
     AND id <> IFNULL(NEW.id, 0);
  IF cnt >= 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A user can have at most 2 week offs';
  END IF;
END$$
DELIMITER ;

-- ======================
-- Table: tasks (ad-hoc tasks, non-recurring general tasks)
-- This can be used for one-off tasks separate from the recurring template system
-- ======================
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_id` CHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `priority` ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'low',
  `status` ENUM('pending','in_progress','completed','archived') NOT NULL DEFAULT 'pending',
  `remarks` TEXT DEFAULT NULL,
  `comments` TEXT DEFAULT NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `assigned_to` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_task_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- ======================
-- Table: task_remarks
-- ======================
CREATE TABLE IF NOT EXISTS `task_remarks` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_id` BIGINT UNSIGNED NOT NULL,
  `remarks` TEXT NOT NULL,
  `comments` TEXT NULL,
  `comment_by` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_remark_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_remark_by` FOREIGN KEY (`comment_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- ======================
-- Table: posts
-- ======================
CREATE TABLE IF NOT EXISTS `posts` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `post` TEXT NOT NULL,
  `publish` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_posts_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- SELECT COUNT(*) as cnt FROM posts WHERE 

-- DROP TABLE tasks_list; --, user_task_assignments;
-- ======================
-- New: tasks_list (task templates / master list for recurring daily/weekly/once tasks)
-- ======================
CREATE TABLE IF NOT EXISTS `tasks_list` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_list_id` CHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  `title` TEXT NOT NULL,
  `description` TEXT NULL,
  `priority` ENUM('low','medium','high') NOT NULL DEFAULT 'low',
  `recurrence_type` ENUM('daily','weekly','once') NOT NULL DEFAULT 'daily',
  `recurrence_weekdays` SET('mon','tue','wed','thu','fri','sat','sun') DEFAULT NULL,
  `once_date` DATE DEFAULT NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tasks_list_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_tasks_list_created_by` (`created_by`),
  INDEX `idx_tasks_list_active` (`is_active`)
);


-- ALTER TABLE `tasks_list`
--     ADD COLUMN `updated_by` BIGINT UNSIGNED NULL AFTER `created_by`,
--     ADD COLUMN `deleted_by` BIGINT UNSIGNED NULL AFTER `updated_by`;
-- ======================
-- New: user_task_assignments (mapping task templates -> users)
-- DROP TABLE user_task_assignments;
-- ======================
CREATE TABLE IF NOT EXISTS `user_task_assignments` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_list_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `assigned_by` BIGINT UNSIGNED NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT `fk_uta_task` FOREIGN KEY (`task_list_id`) REFERENCES `tasks_list`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uta_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uta_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `ux_task_user` (`task_list_id`, `user_id`),
  INDEX `idx_uta_user` (`user_id`),
  INDEX `idx_uta_task` (`task_list_id`)
);

-- DROP TABLE users_daily_task_completions;
-- ======================
-- Table: users_daily_task_completions
-- Updated to reference tasks_list (task templates)
-- ======================
CREATE TABLE IF NOT EXISTS `users_daily_task_completions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- legacy column `task_id` removed in this schema and replaced by `task_list_id`
  `task_list_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `completed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `for_date` DATE NOT NULL,
  `remarks` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `deleted_at` DATETIME NULL,
  CONSTRAINT `fk_udtc_tasklist` FOREIGN KEY (`task_list_id`) REFERENCES `tasks_list` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_udtc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `ux_task_for_date` (`task_list_id`, `for_date`, `user_id`),
  INDEX `idx_udtc_for_date` (`for_date`),
  INDEX `idx_udtc_user` (`user_id`)
);

-- DROP Table if exists users_daily_task_remarks; 
CREATE TABLE IF NOT EXISTS `users_daily_task_remarks` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_list_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `for_date` DATE NOT NULL,  
  -- remark written by the assigned user
  `remarks` TEXT DEFAULT NULL,  
  -- comment written by manager/assigner (or admin)
  `comments` TEXT DEFAULT NULL,
  `comment_by` BIGINT UNSIGNED DEFAULT NULL,  
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_udtr_tasklist`
    FOREIGN KEY (`task_list_id`) REFERENCES `tasks_list`(`id`) ON DELETE CASCADE,
    
  CONSTRAINT `fk_udtr_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    
  CONSTRAINT `fk_udtr_comment_by`
    FOREIGN KEY (`comment_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,  
  -- one record per task/user/date
  UNIQUE KEY `ux_udtr_task_user_date` (`task_list_id`, `user_id`, `for_date`),  
  INDEX `idx_udtr_for_date` (`for_date`),
  INDEX `idx_udtr_user` (`user_id`),
  INDEX `idx_udtr_task` (`task_list_id`)
);

SELECT * FROM users_daily_task_remarks;

SHOW tables;


-- ======================
-- Helpful: Example view for tasks assigned to a user (optional)
-- ======================
/*
CREATE OR REPLACE VIEW vw_user_tasks AS
SELECT u.id AS user_id, u.email, tl.id AS task_list_id, tl.title, tl.recurrence_type, uta.assigned_at, uta.start_date, uta.end_date
FROM user_task_assignments uta
JOIN tasks_list tl ON tl.id = uta.task_list_id
JOIN users u ON u.id = uta.user_id;
*/

-- ======================
-- Final notes
-- ======================
-- 1) If you are migrating from the old `users_daily_tasks` + old `users_daily_task_completions`:
--    - Use a migration routine (NOT included here) to copy templates into tasks_list, create user_task_assignments,
--      and update users_daily_task_completions.task_list_id accordingly. Keep backups.
-- 2) This schema assumes you will move to using `tasks_list` + `user_task_assignments` for recurring tasks.
-- 3) If you prefer to keep legacy tables for now (users_daily_tasks), I can provide a migration script that preserves data.
-- 4) Permission: The created DB user 'user_tms' has full privileges for development convenience. Tighten privileges in production.

-- EOF

-- DROP TABLE special_tasks;
-- DROP TABLE special_task_attachments;

CREATE TABLE IF NOT EXISTS `special_tasks` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_name` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `priority` ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `status` ENUM('open','pending','completed','closed','archived') NOT NULL DEFAULT 'open',
  `category` VARCHAR(100) DEFAULT NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `assigned_to` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX (`created_by`),
  INDEX (`assigned_to`)
);

CREATE TABLE IF NOT EXISTS `special_task_correspondence` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_id` BIGINT UNSIGNED NOT NULL,
  `sender_id` BIGINT UNSIGNED NOT NULL,
  `message` TEXT DEFAULT NULL,
  `is_internal` TINYINT(1) NOT NULL DEFAULT 0, -- 0 = visible to normal users, 1 = internal/admin-only
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX (`task_id`),
  INDEX (`sender_id`),
  CONSTRAINT `fk_stc_task` FOREIGN KEY (`task_id`) REFERENCES `special_tasks`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `special_task_attachments` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_id` BIGINT UNSIGNED DEFAULT NULL,               -- file attached to task itself
  `correspondence_id` BIGINT UNSIGNED DEFAULT NULL,     -- OR file attached to a correspondence message
  `uploaded_by` BIGINT UNSIGNED NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,                    -- original filename
  `file_path` VARCHAR(1000) NULL,                       -- server path or cloud URL
  `mime_type` VARCHAR(100) DEFAULT NULL,
  `file_size` BIGINT UNSIGNED DEFAULT NULL,             -- bytes
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (`task_id`),
  INDEX (`correspondence_id`),
  INDEX (`uploaded_by`),
  CONSTRAINT `fk_sta_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sta_task` FOREIGN KEY (`task_id`) REFERENCES `special_tasks`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sta_corr` FOREIGN KEY (`correspondence_id`) REFERENCES `special_task_correspondence`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_task_or_corr` CHECK (
    (`task_id` IS NOT NULL AND `correspondence_id` IS NULL) OR
    (`task_id` IS NULL AND `correspondence_id` IS NOT NULL)
  )
);

-- ALTER TABLE `special_task_attachments`
--   ADD CONSTRAINT `chk_task_or_corr` CHECK (
--     (task_id IS NOT NULL AND correspondence_id IS NULL) OR
--     (task_id IS NULL AND correspondence_id IS NOT NULL)
--   );

SELECT MD5('3f82edb7-dce6-45ec-b715-11be2cbdb82d');