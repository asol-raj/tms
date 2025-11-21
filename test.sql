-- Active: 1758704013034@@127.0.0.1@3306@taskmgmt

-- 269608
-- $2b$10$zerHh7cnVPC5hiPHZzC89OL5zO7BK07Dh5m8aehp8P8nFEGToFCO2

TRUNCATE TABLE users_daily_task_completions;


 SELECT
      tl.id,
     -- tl.task_list_id AS task_uuid,
      tl.title,
      tl.description,
      tl.priority,
      tl.recurrence_type,
      tl.recurrence_weekdays,
      DATE_FORMAT(tl.once_date, '%m-%d-%Y') AS once_date,
      tl.is_active AS task_active,
      DATE_FORMAT(tl.created_at, '%m-%d-%Y') AS created_at,
      DATE_FORMAT(tl.updated_at, '%m-%d-%Y') AS updated_at,
      -- assignment info
      uta.id AS assignment_id,
      DATE_FORMAT(uta.assigned_at, '%m-%d-%Y') AS assigned_on,
     -- uta.start_date,
     -- uta.end_date,
     -- uta.is_active AS assignment_active,
      -- completion info (for requested date or today)
      CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS is_completed,
      c.id AS completion_id,
      c.user_id AS completion_user_id,
      DATE_FORMAT(c.completed_at, '%m-%d-%Y %T') AS logged_at,
      DATE_FORMAT(c.for_date, '%m-%d-%Y') AS completed_on,
      c.remarks AS remarks,
      -- delayed logic: only meaningful for 'once' tasks (completion date > once_date)
      CASE
        WHEN c.id IS NOT NULL AND tl.recurrence_type = 'once' AND c.for_date > tl.once_date THEN 'Yes'
        ELSE 'No'
      END AS is_delayed
    -- , u.id AS assigned_user_id
    , u.fullname AS assigned_user
    FROM user_task_assignments uta
    JOIN tasks_list tl ON uta.task_list_id = tl.id
    JOIN users u ON u.id = uta.user_id
    -- completion for the particular date (dynamic dateParam passed below)
    LEFT JOIN users_daily_task_completions c
      ON c.task_list_id = tl.id
      AND c.user_id = uta.user_id
      AND c.for_date = CURDATE()
      AND c.is_active = 1
   WHERE tl.recurrence_type = 'daily' AND uta.is_active = 1 AND tl.is_active = 1
 ORDER BY u.fullname, FIELD(tl.priority, "high", "medium", "low"), tl.id

SELECT * FROM users_daily_task_completions;

SELECT * FROM tasks_list;

SELECT * FROM user_task_assignments;

SELECT 
ta.id, 
tl.id as task_id,
tl.title, 
tl.description, 
tl.priority,
tl.recurrence_type,
tl.recurrence_weekdays,
DATE_FORMAT(tl.once_date, '%m-%d-%Y') AS once_date,
ab.fullname as assigned_by,
DATE_FORMAT(ta.assigned_at, '%m-%d-%Y') AS assigned_on,
DATE_FORMAT(c.completed_at, '%m-%d-%Y %T') AS logged_at,
DATE_FORMAT(c.for_date, '%m-%d-%Y') AS completed_on
FROM user_task_assignments ta 
    JOIN tasks_list tl on ta.task_list_id = tl.id
    LEFT JOIN users ab on ab.id = ta.assigned_by
    LEFT JOIN users_daily_task_completions c on c.task_list_id AND c.user_id = ta.user_id
    JOIN users u on u.id = ta.user_id WHERE u.id = 2
    and tl.is_active = TRUE AND ta.is_active = TRUE
;


SELECT * FROM users;
TRUNCATE `users_daily_task_completions`;


SELECT * FROM `users_daily_task_completions`;

SELECT * from users_daily_tasks WHERE user_id = 3;;


SELECT * FROM tasks_list;

SELECT 
    l.id, 
    l.task_list_id, 
    l.title, 
    l.description, 
    l.priority, 
    l.recurrence_type,
    l.recurrence_weekdays, 
    l.once_date, 
    u.fullname as created_by, 
    ub.fullname as updated_by, 
    l.is_active,
DATE_FORMAT(l.created_at, '%m/%d/%Y, $r') as created_at, 
DATE_FORMAT(l.updated_at, '%m/%d/%Y, $r') as updated_at 
FROM tasks_list l LEFT JOIN users u ON u.id = l.created_by LEFT JOIN users ub ON ub.id = l.updated_by
WHERE 1=1;

SELECT * FROM user_task_assignments;

SELECT * FROM users;


SELECT u.`id`, u.`fullname` as `value` FROM `users` u LEFT JOIN `user_task_assignments` ta ON ta.user_id = u.id AND ta.`task_list_id` = ? WHERE ta.`user_id` IS NULL AND u.`is_active` = 1 AND u.`user_role` = 'user';

SELECT 
    u.`id`,
    u.`fullname` AS `value`
FROM `users` u
LEFT JOIN `user_task_assignments` ta 
       ON ta.user_id = u.id 
      AND ta.`task_list_id` = 1
WHERE ta.`user_id` IS NOT NULL
  AND u.`is_active` = 1
  AND u.`user_role` = 'user';