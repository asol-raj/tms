-- Active: 1758704013034@@127.0.0.1@3306@taskmgmt

SELECT
    t.id,
    t.title,
    t.description,
    t.priority,
    t.status,
    t.remarks,
    u.fullname as created_by,
    a.fullname as assigned_to,
    DATE_FORMAT(t.created_at, '%m-%d-%Y, %r') as created_at
FROM tasks t
    JOIN users u on u.id = t.created_by
    JOIN users a on a.id = t.assigned_to
ORDER BY t.id desc
LIMIT 100;

select user_id, fullname
from users
where
    user_role = 'user'
    and is_active = true

SELECT * FROM users;

SELECT * from user_profile;

SHOW COLUMNS FROM users;

SELECT COLUMN_NAME, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_SCHEMA = 'taskmgmt'
    AND TABLE_NAME = 'users';

select * from users_daily_tasks;

SELECT
    udt.id,
    u.fullname as user,
    udt.title,
    udt.description,
    udt.priority,
    a.fullname as assigned_by,
    udt.recurrence_type,
    udt.recurrence_weekdays,
    udt.once_date,
    udt.is_active,
    DATE_FORMAT(udt.created_at, '%m-%d-%Y') as created_at
FROM
    users_daily_tasks udt
    JOIN users u on u.id = udt.user_id
    left JOIN users a on a.id = udt.assigned_by
WHERE
    udt.user_id = 2
ORDER BY FIELD(
        udt.priority, 'high', 'medium', 'low'
    ), udt.id