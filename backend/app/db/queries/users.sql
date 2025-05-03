-- name: get_user_by_email
SELECT 
    id, 
    email, 
    hashed_password, 
    first_name,
    last_name,
    is_active, 
    is_superuser, 
    created_at, 
    updated_at
FROM users 
WHERE email = $1;

-- name: get_user_by_id
SELECT 
    id,
    email,
    hashed_password,
    first_name,
    last_name,
    is_active,
    is_superuser,
    created_at,
    updated_at
FROM users
WHERE id = $1;

-- name: create_user
INSERT INTO users (
    email,
    hashed_password,
    first_name,
    last_name,
    is_active,
    is_superuser
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING id;

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
RETURNING *;

-- name: delete_user
DELETE FROM users
WHERE id = $1
RETURNING *; 