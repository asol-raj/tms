ALTER TABLE users_daily_task_completions
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN deleted_at DATETIME NULL;