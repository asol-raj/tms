-- Active: 1758133010005@@127.0.0.1@3306@taskmgmt

CREATE DATABASE IF NOT EXISTS taskmgmt;
USE taskmgmt;

CREATE USER IF NOT EXISTS 'user_tms' @'%' IDENTIFIED BY '269608Raj$';
-- DROP USER IF EXISTS 'user_tms'@'%';

GRANT ALL PRIVILEGES ON taskmgmt.* TO 'user_tms' @'%' WITH GRANT OPTION;
-- REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'user_tms'@'%';

DROP Table if EXISTS tasks, user_profile, users;

SHOW tables;

CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` CHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
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

SELECT * FROM users;
UPDATE users SET user_role = 'admin' WHERE id = 1;


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
    `task_id` CHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),  
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'low',
    `status` ENUM('pending', 'in_progress', 'completed', 'archived') NOT NULL DEFAULT 'pending',
    `remarks` TEXT DEFAULT NULL,
    `comments` TEXT DEFAULT NULL,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `assigned_to` BIGINT UNSIGNED NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, 
    CONSTRAINT fk_task_creator FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT fk_task_assignee FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

SELECT * FROM tasks;

