export const Queries = {
    test: 'select uuid();',
    deletePost: "delete from posts where id =?;",
    updateTask: "update `tasks` set `title`=?, `description`=?, `priority`=?, `assigned_to`=? where `id`=?;",
    updteComment: "update tasks set comments=? where id=?;",
    updteRemarks: "update tasks set remarks=? where id=?;",
    updateDailyTaskDescription: "update users_daily_tasks set description=? where id=?;", 
    user_report: "WITH RECURSIVE dates AS ( SELECT DATE(?) AS dt UNION ALL SELECT DATE_ADD(dt, INTERVAL 1 DAY) FROM dates WHERE dt < LAST_DAY(?) ) SELECT tl.id AS task_id, tl.task_list_id, tl.title, d.dt AS for_date, CASE WHEN NOT ( tl.recurrence_type = 'daily' OR (tl.recurrence_type = 'weekly' AND FIND_IN_SET(LOWER(DATE_FORMAT(d.dt, '%a')), tl.recurrence_weekdays)) OR (tl.recurrence_type = 'once' AND tl.once_date = d.dt) ) THEN 'N/A' WHEN c.id IS NULL THEN 'No' WHEN TIMESTAMPDIFF( HOUR, CONCAT(d.dt, ' 00:00:00'), c.completed_at ) > 24 THEN CONCAT( 'Yes (', TIMESTAMPDIFF( HOUR, CONCAT(d.dt, ' 00:00:00'), c.completed_at ), ' hrs)' ) ELSE 'No' END AS status, CASE WHEN c.id IS NULL THEN NULL ELSE TIMESTAMPDIFF(HOUR, CONCAT(d.dt, ' 00:00:00'), c.completed_at) END AS hours_late, c.completed_at, c.remarks FROM ( SELECT DISTINCT tl.* FROM tasks_list tl INNER JOIN user_task_assignments uta ON uta.task_list_id = tl.id AND uta.user_id = ? AND uta.is_active = 1 WHERE tl.is_active = 1 ) tl CROSS JOIN dates d LEFT JOIN users_daily_task_completions c ON c.task_list_id = tl.id AND c.user_id = ? AND c.for_date = d.dt AND c.is_active = 1 ORDER BY tl.id, d.dt;"
}