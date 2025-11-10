-- Active: 1758133010005@@127.0.0.1@3306@taskmgmt

CREATE DATABASE IF NOT EXISTS taskmgmt;
USE taskmgmt;

CREATE USER IF NOT EXISTS 'user_tms' @'%' IDENTIFIED BY '269608Raj$';
-- DROP USER IF EXISTS 'user_tms'@'%';

GRANT ALL PRIVILEGES ON taskmgmt.* TO 'user_tms' @'%' WITH GRANT OPTION;
-- REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'user_tms'@'%';

CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `username` VARCHAR(255) NULL UNIQUE,
    `first_name` VARCHAR(100) NULL,
    `last_name` VARCHAR(100) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `user_role` ENUM('admin', 'manager', 'user') NOT NULL DEFAULT 'user',
    `is_active` BOOLEAN NOT NULL DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,    
    INDEX `idx_username` (`username`), -- Good to index this if you keep it
    INDEX `idx_email` (`email`),
    INDEX `idx_role` (`user_role`)
);

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
    `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,    
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- Tasks Table
CREATE TABLE `tasks` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,    
    `task_id` CHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),  
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    `status` ENUM('pending', 'in_progress', 'completed', 'archived') NOT NULL DEFAULT 'pending',
    `remarks` TEXT DEFAULT NULL,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `assigned_to` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP, 
    CONSTRAINT fk_task_creator FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT fk_task_assignee FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

