-- Active: 1758704013034@@127.0.0.1@3306@taskmgmt

CREATE DATABASE IF NOT EXISTS taskmgmt;

USE taskmgmt;

CREATE USER IF NOT EXISTS 'user_tms' @'%' IDENTIFIED BY '269608Raj$';
-- DROP USER IF EXISTS 'user_tms'@'%';

GRANT ALL PRIVILEGES ON taskmgmt.* TO 'user_tms' @'%'
WITH
GRANT OPTION;
-- REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'user_tms'@'%';

-- DROP Table if EXISTS users_daily_task_completions, users_daily_tasks, task_remarks, POSTS, tasks, user_profile, users;

SHOW tables;

CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` CHAR(36) NOT NULL UNIQUE DEFAULT(UUID()),
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `username` VARCHAR(255) NULL UNIQUE,
    `fullname` VARCHAR(100) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `user_role` ENUM('admin', 'manager', 'user') NOT NULL DEFAULT 'user',
    `is_active` BOOLEAN NOT NULL DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_username` (`username`), -- Good to index this if you keep it
    INDEX `idx_email` (`email`),
    INDEX `idx_role` (`user_role`)
);
-- UPDATE users SET user_role = 'admin' WHERE id = 1;

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
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- safe recreate: drop triggers if they exist
DROP TRIGGER IF EXISTS trg_user_weekoffs_before_insert;

DROP TRIGGER IF EXISTS trg_user_weekoffs_before_update;

-- create table (if not already present)
CREATE TABLE IF NOT EXISTS user_week_offs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    week_day ENUM(
        'mon',
        'tue',
        'wed',
        'thu',
        'fri',
        'sat',
        'sun'
    ) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_uwo_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY ux_user_weekday (user_id, week_day),
    INDEX idx_uwo_user (user_id),
    INDEX idx_uwo_weekday (week_day)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

DELIMITER $$

CREATE TRIGGER trg_user_weekoffs_before_insert
BEFORE INSERT ON user_week_offs
FOR EACH ROW
BEGIN
  DECLARE cnt INT DEFAULT 0;
  SELECT COUNT(*) INTO cnt
    FROM user_week_offs
   WHERE user_id = NEW.user_id;
  IF cnt >= 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A user can have at most 2 week offs';
  END IF;
END$$

CREATE TRIGGER trg_user_weekoffs_before_update
BEFORE UPDATE ON user_week_offs
FOR EACH ROW
BEGIN
  DECLARE cnt INT DEFAULT 0;
  -- Count rows for NEW.user_id excluding the current row (works cleanly for UPDATE)
  SELECT COUNT(*) INTO cnt
    FROM user_week_offs
   WHERE user_id = NEW.user_id
     AND id <> IFNULL(NEW.id, 0);

  IF cnt >= 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A user can have at most 2 week offs';
  END IF;
END$$

DELIMITER;






-- Tasks Table
CREATE TABLE IF NOT EXISTS `tasks` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `task_id` CHAR(36) NOT NULL UNIQUE DEFAULT(UUID()),
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `priority` ENUM(
        'low',
        'medium',
        'high',
        'urgent'
    ) NOT NULL DEFAULT 'low',
    `status` ENUM(
        'pending',
        'in_progress',
        'completed',
        'archived'
    ) NOT NULL DEFAULT 'pending',
    `remarks` TEXT DEFAULT NULL,
    `comments` TEXT DEFAULT NULL,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `assigned_to` BIGINT UNSIGNED NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_creator FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT fk_task_assignee FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- SELECT * FROM tasks;

create table `task_remarks` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `task_id` BIGINT UNSIGNED NOT NULL,
    `remarks` TEXT NOT NULL,
    `comments` TEXT NULL,
    `comment_by` BIGINT UNSIGNED,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    Foreign Key (`task_id`) REFERENCES `tasks` (`id`) on delete CASCADE,
    Foreign Key (`comment_by`) REFERENCES `users` (`id`) on delete CASCADE
);
-- SELECT * FROM tasks;

CREATE Table IF NOT EXISTS `posts` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `post` TEXT NOT NULL,
    `publish` TINYINT DEFAULT(1),
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    Foreign Key (`created_by`) REFERENCES `users` (`id`) on delete CASCADE
);

-- users_daily_tasks (templates)
CREATE TABLE IF NOT EXISTS `users_daily_tasks` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `title` TEXT NOT NULL,
    `description` TEXT NULL,
    `priority` ENUM('low', 'medium', 'high') DEFAULT 'low',
    `assigned_by` BIGINT UNSIGNED NULL,
    `recurrence_type` ENUM('daily', 'weekly', 'once') NOT NULL DEFAULT 'daily',
    `recurrence_weekdays` SET(
        'mon',
        'tue',
        'wed',
        'thu',
        'fri',
        'sat',
        'sun'
    ) DEFAULT NULL,
    `once_date` DATE DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (id) ON DELETE CASCADE,
    FOREIGN KEY (`assigned_by`) REFERENCES `users` (id) ON DELETE SET NULL,
    INDEX idx_udt_user (user_id),
    INDEX idx_udt_assigned_by (assigned_by),
    INDEX idx_udt_recurrence (recurrence_type)
);


-- 1. Tasks master list (templates)
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
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- helper column for migration: store old users_daily_tasks.id if migrating
  `old_udt_id` BIGINT UNSIGNED NULL,
  CONSTRAINT fk_tasks_list_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tasks_list_created_by (created_by),
  INDEX idx_tasks_list_active (is_active)
);

-- 2. Assignment table: which users have a given template assigned
CREATE TABLE IF NOT EXISTS `user_task_assignments` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `task_list_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `assigned_by` BIGINT UNSIGNED NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `start_date` DATE DEFAULT NULL,    -- optional: when assignment becomes effective
  `end_date` DATE DEFAULT NULL,      -- optional: when assignment ends
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_uta_task FOREIGN KEY (task_list_id) REFERENCES tasks_list(id) ON DELETE CASCADE,
  CONSTRAINT fk_uta_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_uta_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY ux_task_user (task_list_id, user_id),
  INDEX idx_uta_user (user_id),
  INDEX idx_uta_task (task_list_id)
);


-- users_daily_task_completions
CREATE TABLE IF NOT EXISTS `users_daily_task_completions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `task_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `completed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `for_date` DATE NOT NULL,
    `remarks` TEXT DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `deleted_at` DATETIME NULL,
    FOREIGN KEY (`task_id`) REFERENCES users_daily_tasks (id) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY ux_task_for_date (
        `task_id`,
        `for_date`,
        `user_id`
    ),
    INDEX idx_udtc_for_date (for_date),
    INDEX idx_udtc_user (user_id)
);

ALTER TABLE users_daily_task_completions
  ADD COLUMN task_list_id BIGINT UNSIGNED NULL AFTER task_id,
  ADD INDEX idx_udtc_task_list_id (task_list_id);