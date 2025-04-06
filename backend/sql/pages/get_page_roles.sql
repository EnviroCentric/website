SELECT
    r.role_id
FROM
    roles r
    JOIN page_roles pr ON r.role_id = pr.role_id
WHERE
    pr.page_id = %s
ORDER BY
    r.name; 