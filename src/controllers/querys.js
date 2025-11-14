export const Queries = {
    test: 'select uuid();',
    deletePost: "delete from posts where id =?;",
    updateTask: "update `tasks` set `title`=?, `description`=?, `priority`=?, `assigned_to`=? where `id`=?;",
    updteComment: "update tasks set comments=? where id=?;",
    updteRemarks: "update tasks set remarks=? where id=?;",
    updateDailyTaskDescription: "update users_daily_tasks set description=? where id=?;"
}