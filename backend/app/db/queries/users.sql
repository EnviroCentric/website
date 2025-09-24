-- name: get_user_by_email
SELECT
  id,
  email,
  hashed_password,
  first_name,
  last_name,
  is_active,
  is_superuser
FROM users
WHERE email = $1;

-- name: get_user_highest_role_level
SELECT COALESCE(MAX(r.level), 0) AS highest_level
FROM roles r
JOIN user_roles ur ON r.id = ur.role_id
WHERE ur.user_id = $1;

-- name: get_all_users
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.is_active,
  u.is_superuser,
  u.created_at,
  u.updated_at,
  u.highest_level,
  COALESCE(
    json_agg(
      json_build_object(
        'id', r.id,
        'name', r.name,
        'description', r.description,
        'level', r.level,
        'created_at', r.created_at
      )
    ) FILTER (WHERE r.id IS NOT NULL),
    '[]'::json
  )::jsonb AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
GROUP BY u.id
ORDER BY u.created_at DESC;

-- name: get_user_by_id
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.is_active,
  u.is_superuser,
  u.created_at,
  u.updated_at,
  u.highest_level,
  COALESCE(
    json_agg(
      json_build_object(
        'id', r.id,
        'name', r.name,
        'description', r.description,
        'level', r.level,
        'created_at', r.created_at
      )
    ) FILTER (WHERE r.id IS NOT NULL),
    '[]'::json
  )::jsonb AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
WHERE u.id = $1
GROUP BY u.id;

-- name: create_user
INSERT INTO users (
  email,
  hashed_password,
  first_name,
  last_name,
  is_active,
  is_superuser
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- name: update_user
UPDATE users
SET
  email = COALESCE($2, email),
  hashed_password = COALESCE($3, hashed_password),
  first_name = COALESCE($4, first_name),
  last_name = COALESCE($5, last_name),
  is_active = COALESCE($6, is_active),
  is_superuser = COALESCE($7, is_superuser),
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING
  id, email, first_name, last_name, is_active, is_superuser, created_at, updated_at, highest_level;

-- name: delete_user
DELETE FROM users
WHERE id = $1
RETURNING id;

-- name: delete_user_roles
DELETE FROM user_roles WHERE user_id = $1;

-- name: insert_user_role
INSERT INTO user_roles (user_id, role_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: recalc_user_highest_role_level
WITH maxlvl AS (
  SELECT COALESCE(MAX(r.level), 0) AS lvl
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = $1
)
UPDATE users
SET highest_level = (SELECT lvl FROM maxlvl)
WHERE id = $1;
