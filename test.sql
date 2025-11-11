-- Active: 1758704013034@@127.0.0.1@3306@taskmgmt


SELECT t.id, t.title, t.description, t.priority, t.status, t.remarks, u.fullname as created_by, a.fullname as assigned_to, DATE_FORMAT(t.created_at, '%m-%d-%Y, %r') as created_at FROM tasks t JOIN users u on u.id = t.created_by JOIN users a on a.id = t.assigned_to ORDER BY t.id desc LIMIT 100;

select user_id, fullname from users where user_role='user' and is_active=true

SELECT * FROM users;
