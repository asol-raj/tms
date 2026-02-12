-- Active: 1758704013034@@127.0.0.1@3306@taskmgmt

select * from users_daily_task_completions

INSERT INTO `tasks_list` (`title`, `description`) VALUES 
('DELIVERY SCHEDULING REPORT', ''),
('HOT BUTTON SHEET', ''),
('STATUS CALL', ''),
('PURCHASING INBOX SCRUB', ''),
('WVL PICKUPS MTO CHECK', ''),
('PO PLACEMENT', ''),
('INVOICE TO CUSTOMER', ''),
('SALES COMPARISON REPORT', ''),
('FLOOR MODEL SOLD REPORT', ''),
('GROSS MARGIN REPORT', ''),
('SALES PERSON PERFORMANCE REPORT', ''),
('SALES SUMMARY REPORT', ''),
('MANAGERS PERFORMANCE REPORT', ''),
('PROSPECTIVE BUYERS SHEET', ''),
('INVENTORY LOCATION SCRUB', ''),
('ESIGN NEED TO BE CHECKED', ''),
('DAY CLOSING REPORT', ''),
('PRICE TAG PRINTING', ''),
('DAMAGE ITEM REPORT', ''),
('PENDING RECEIVABLES', ''),
('CFC SEO REPORT', ''),
('PICKUP PENDING FOR SCHEDULING REPORT', ''),
('SERVICE ORDER REPORT', ''),
('Waynesville Tags Printing', ''),
('ZIP CODE SCRUB', ''),
('MTD DELIVERY NUMBERS REPORT', '');


DELETE FROM tasks_list WHERE id >0;
ALTER TABLE tasks_list AUTO_INCREMENT = 1;
TRUNCATE tasks_list;
INSERT INTO `tasks_list` (`title`) VALUES
('ALL SALES FOLDER'),
('CUSTOMER ID SCRUB'),
('DAMAGE ITEM REPORT'),
('DAY CLOSING REPORT'),
('DELIVERY SCHEDULING REPORT'),
('EMAIL BLAST'),
('ESIGN CHECK'),
('ESIGN CHECK'),
('FLOOR MODEL SOLD REPORT'),
('GRAPHIC WORK ( POST, VIDEO)'),
('GROSS MARGIN REPORT'),
('HOT BUTTON SHEET'),
('HOT BUTTON SHEET'),
('INVENTORY LOCATION SCRUB'),
('INVOICE TO CUSTOMER'),
('LAST PASS CHECK(LP1,LP2,LP3)'),
('MANAGERS PERFORMANCE REPORT'),
('MONTHLY MARKETING PREP WORK REPORT'),
('MTO MARKING FOR ARDEN'),
('MTD DELIVERY NUMBERS REPORT'),
('OPEN MTO SCRUBBING'),
('PACKAGE SCRUB'),
('PENDING RECEIVABLES'),
('PO MATCHED WITH ACK'),
('PO SCRUBING REPORT'),
('PRICE LIST UPDATED'),
('PRICE TAG PRINTING'),
('PROSPECTIVE BUYERS SHEET'),
('PURCHASING INBOX SCRUB'),
('SALES COMPARISON REPORT'),
('SALES PERSON PERFORMANCE REPORT'),
('SPECIAL ORDERS PLACEMENT'),
('STATUS CALL'),
('STOCK MATCHUP'),
('STOCK ORDER PLACEMENT'),
('SYSTEM CLEANUP'),
('SYSTEM ERROR'),
('TEXT BLAST'),
('WORK ON SERVICE ORDER SHEET'),
('WORK ON SERVICE ORDER SHEET'),
('WVL PICKUP MTO CHECK'),
('WVL PICKUP MTO CHECK'),
('ZIP CODE SCRUB');



-- params: 1 = start_of_month (YYYY-MM-01), 2 = start_of_month (same value), 3 = user_id, 4 = user_id
WITH RECURSIVE dates AS (
  SELECT DATE('2025-11-01') AS dt
  UNION ALL
  SELECT DATE_ADD(dt, INTERVAL 1 DAY) FROM dates
  WHERE dt < LAST_DAY('2025-11-01')
)
SELECT
  tl.id AS task_id,
  tl.task_list_id,
  tl.title,
  d.dt AS for_date,
  -- Determine whether the task is scheduled on this date
  CASE
    WHEN NOT (
      tl.recurrence_type = 'daily'
      OR (tl.recurrence_type = 'weekly' AND FIND_IN_SET(LOWER(DATE_FORMAT(d.dt, '%a')), tl.recurrence_weekdays))
      OR (tl.recurrence_type = 'once' AND tl.once_date = d.dt)
    ) THEN 'N/A'
    -- If scheduled, check completion
    WHEN c.id IS NULL THEN 'No'
    WHEN TIMESTAMPDIFF(
           HOUR,
           CONCAT(d.dt, ' 00:00:00'),
           c.completed_at
         ) > 24
      THEN CONCAT(
             'Yes (',
             TIMESTAMPDIFF(
               HOUR,
               CONCAT(d.dt, ' 00:00:00'),
               c.completed_at
             ),
             ' hrs)'
           )
    ELSE 'No'
  END AS status,
  -- optional numeric field for easier sorting/logic in app
  CASE WHEN c.id IS NULL THEN NULL
       ELSE TIMESTAMPDIFF(HOUR, CONCAT(d.dt, ' 00:00:00'), c.completed_at)
  END AS hours_late,
  c.completed_at,
  c.remarks
FROM (
  -- tasks assigned to the user (active assignments)
  SELECT DISTINCT tl.*
  FROM tasks_list tl
  INNER JOIN user_task_assignments uta
    ON uta.task_list_id = tl.id
    AND uta.user_id = 2
    AND uta.is_active = 1
  WHERE tl.is_active = 1
) tl
CROSS JOIN dates d
LEFT JOIN users_daily_task_completions c
  ON c.task_list_id = tl.id
  AND c.user_id = 2
  AND c.for_date = d.dt
  AND c.is_active = 1
ORDER BY tl.id, d.dt;

SELECT * FROM users_daily_task_completions;

SELECT * FROM tasks_list;

select * from user_task_assignments;

SELECT * FROM users;

WITH RECURSIVE dates AS ( SELECT DATE('2025-11-01') AS dt UNION ALL SELECT DATE_ADD(dt, INTERVAL 1 DAY) FROM dates WHERE dt < LAST_DAY('2025-11-01') ) SELECT tl.id AS task_id, tl.task_list_id, tl.title, d.dt AS for_date, CASE WHEN NOT ( tl.recurrence_type = 'daily' OR (tl.recurrence_type = 'weekly' AND FIND_IN_SET(LOWER(DATE_FORMAT(d.dt, '%a')), tl.recurrence_weekdays)) OR (tl.recurrence_type = 'once' AND tl.once_date = d.dt) ) THEN 'N/A' WHEN c.id IS NULL THEN 'No' WHEN TIMESTAMPDIFF( HOUR, CONCAT(d.dt, ' 00:00:00'), c.completed_at ) > 24 THEN CONCAT( 'Yes (', TIMESTAMPDIFF( HOUR, CONCAT(d.dt, ' 00:00:00'), c.completed_at ), ' hrs)' ) ELSE 'No' END AS status, CASE WHEN c.id IS NULL THEN NULL ELSE TIMESTAMPDIFF(HOUR, CONCAT(d.dt, ' 00:00:00'), c.completed_at) END AS hours_late, c.completed_at, c.remarks FROM ( SELECT DISTINCT tl.* FROM tasks_list tl INNER JOIN user_task_assignments uta ON uta.task_list_id = tl.id AND uta.user_id = 2 AND uta.is_active = 1 WHERE tl.is_active = 1 ) tl CROSS JOIN dates d LEFT JOIN users_daily_task_completions c ON c.task_list_id = tl.id AND c.user_id = 2 AND c.for_date = d.dt AND c.is_active = 1 ORDER BY tl.id, d.dt;


-- delete FROM special_tasks; 
-- ALTER TABLE special_tasks AUTO_INCREMENT = 1;
SELECT * FROM special_tasks;
SELECT * FROM special_task_attachments;

TRUNCATE Table users_daily_task_completions;

select st.*, cb.fullname as createdby_name, at.fullname as assignedto_names
      FROM special_tasks st 
        JOIN users cb on cb.id = st.created_by
        LEFT JOIN users at on at.id = st.assigned_to
      WHERE st.id = 8;

SELECT * FROM users_daily_task_completions;
SELECT * FROM user_task_assignments;


SELECT * from attendance;