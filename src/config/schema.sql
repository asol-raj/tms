-- Active: 1758704013034@@127.0.0.1@3306@taskmgmt

CREATE DATABASE IF NOT EXISTS taskmgmt;

USE taskmgmt;

CREATE USER IF NOT EXISTS 'user_tms' @'%' IDENTIFIED BY '269608Raj$';
-- DROP USER IF EXISTS 'user_tms'@'%';

GRANT ALL PRIVILEGES ON taskmgmt.* TO 'user_tms' @'%'
WITH
GRANT OPTION;
-- REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'user_tms'@'%';

DROP Table if EXISTS tasks, user_profile, users;

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

-- SELECT * FROM users;

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

-- DROP TABLE tasks;
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
    Foreign Key (`comment_by`) REFERENCES `users`(`id`) on delete CASCADE
);
-- SELECT * FROM tasks;

CREATE Table IF NOT EXISTS `posts`( 
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `post` TEXT NOT NULL,
    `publish` TINYINT DEFAULT(1),
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    Foreign Key (`created_by`) REFERENCES `users`(`id`) on delete CASCADE
);


-- users_daily_tasks (templates)
-- DROP TABLE users_daily_tasks;
CREATE TABLE IF NOT EXISTS `users_daily_tasks` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `title` TEXT NOT NULL,
  `description` TEXT NULL,
  `priority` ENUM('low', 'medium', 'high') DEFAULT 'low',
  `assigned_by` BIGINT UNSIGNED NULL,
  `recurrence_type` ENUM('daily','weekly','once') NOT NULL DEFAULT 'daily',
  `recurrence_weekdays` SET('mon','tue','wed','thu','fri','sat','sun') DEFAULT NULL,
  `once_date` DATE DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(id) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_by`) REFERENCES `users`(id) ON DELETE SET NULL,
  INDEX idx_udt_user (user_id),
  INDEX idx_udt_assigned_by (assigned_by),
  INDEX idx_udt_recurrence (recurrence_type)
);

-- users_daily_task_completions
CREATE TABLE IF NOT EXISTS `users_daily_task_completions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `task_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `completed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `for_date` DATE NOT NULL,
  `remarks` TEXT DEFAULT NULL,
  FOREIGN KEY (`task_id`) REFERENCES users_daily_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY ux_task_for_date (`task_id`, `for_date`, `user_id`),
  INDEX idx_udtc_for_date (for_date),
  INDEX idx_udtc_user (user_id)
) 


