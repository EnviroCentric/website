-- Project queries
-- name: create_project
INSERT INTO projects (company_id, name, description, status, current_start_date, current_end_date)
VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;

-- name: get_project
SELECT 
    p.*,
    c.name as company_name
FROM projects p
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.id = $1;

-- name: update_project
UPDATE projects 
SET 
    name = COALESCE($2, name),
    description = COALESCE($3, description),
    status = COALESCE($4, status),
    current_start_date = COALESCE($5, current_start_date),
    current_end_date = COALESCE($6, current_end_date),
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 
RETURNING *;

-- name: delete_project
DELETE FROM projects WHERE id = $1;

-- name: list_projects
SELECT 
    p.*,
    c.name as company_name
FROM projects p
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY p.created_at DESC;

-- name: list_projects_by_company
SELECT 
    p.*,
    c.name as company_name
FROM projects p
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.company_id = $1
ORDER BY p.created_at DESC;

-- name: list_technician_projects
SELECT DISTINCT p.*, c.name as company_name
FROM projects p
LEFT JOIN companies c ON p.company_id = c.id
JOIN project_visits pv ON p.id = pv.project_id
WHERE pv.technician_id = $1
ORDER BY p.created_at DESC;

-- Address queries
-- name: create_address
INSERT INTO addresses (name, address_line1, address_line2, city, state, zip, notes) 
VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;

-- name: get_address
SELECT * FROM addresses WHERE id = $1;

-- name: update_address
UPDATE addresses 
SET 
    name = COALESCE($2, name),
    address_line1 = COALESCE($3, address_line1),
    address_line2 = COALESCE($4, address_line2),
    city = COALESCE($5, city),
    state = COALESCE($6, state),
    zip = COALESCE($7, zip),
    notes = COALESCE($8, notes)
WHERE id = $1 
RETURNING *;

-- name: delete_address
DELETE FROM addresses WHERE id = $1;

-- name: get_project_addresses
SELECT DISTINCT a.* 
FROM addresses a
JOIN project_visits pv ON a.id = pv.address_id
WHERE pv.project_id = $1
ORDER BY a.created_at DESC;

-- name: get_project_visits
SELECT 
    pv.*,
    a.name as address_name,
    a.address_line1,
    a.city,
    a.state,
    u.first_name || ' ' || u.last_name as technician_name
FROM project_visits pv
JOIN addresses a ON pv.address_id = a.id
LEFT JOIN users u ON pv.technician_id = u.id
WHERE pv.project_id = $1
ORDER BY pv.visit_date DESC;

-- name: get_project_visits_by_date
SELECT 
    pv.*,
    a.name as address_name,
    a.address_line1,
    a.city,
    a.state,
    u.first_name || ' ' || u.last_name as technician_name
FROM project_visits pv
JOIN addresses a ON pv.address_id = a.id
LEFT JOIN users u ON pv.technician_id = u.id
WHERE pv.project_id = $1 AND pv.visit_date = $2
ORDER BY pv.visit_date DESC;

-- Project Visit queries (replaces old project technician assignment)
-- name: create_project_visit
INSERT INTO project_visits (project_id, address_id, visit_date, technician_id, notes)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: update_project_visit
UPDATE project_visits 
SET 
    visit_date = COALESCE($2, visit_date),
    technician_id = COALESCE($3, technician_id),
    notes = COALESCE($4, notes)
WHERE id = $1
RETURNING *;

-- name: delete_project_visit
DELETE FROM project_visits WHERE id = $1;

-- name: get_project_technicians
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.highest_level,
    pt.assigned_at,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', r.id,
                'name', r.name,
                'level', r.level
            )
        ) FILTER (WHERE r.id IS NOT NULL),
        '[]'::json
    ) as roles
FROM users u
JOIN project_technicians pt ON u.id = pt.technician_id
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE pt.project_id = $1
GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone, u.highest_level, pt.assigned_at
ORDER BY pt.assigned_at DESC;

-- name: check_technician_assigned_to_project
SELECT EXISTS(
    SELECT 1 
    FROM project_technicians 
    WHERE project_id = $1 AND technician_id = $2
) as is_assigned;

-- name: check_address_in_project
SELECT EXISTS(
    SELECT 1
    FROM project_visits
    WHERE project_id = $1 AND address_id = $2
) as is_project_address;

-- Project technician assignment queries (separate from visits)
-- name: assign_technician_to_project
INSERT INTO project_technicians (project_id, technician_id, assigned_by)
VALUES ($1, $2, $3)
ON CONFLICT (project_id, technician_id) DO NOTHING
RETURNING *;

-- name: unassign_technician_from_project
DELETE FROM project_technicians 
WHERE project_id = $1 AND technician_id = $2
RETURNING *;

-- name: list_technician_assigned_projects
SELECT DISTINCT p.*, c.name as company_name
FROM projects p
LEFT JOIN companies c ON p.company_id = c.id
JOIN project_technicians pt ON p.id = pt.project_id
WHERE pt.technician_id = $1
ORDER BY p.created_at DESC;
