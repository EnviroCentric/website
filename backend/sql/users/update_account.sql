UPDATE users
SET
    email = COALESCE(%s, email),
    hashed_password = COALESCE(%s, hashed_password),
    first_name = COALESCE(%s, first_name),
    last_name = COALESCE(%s, last_name),
    updated_at = NOW()
WHERE user_id = %s
RETURNING
    user_id,
    first_name,
    last_name,
    email,
    created_at,
    updated_at,
    last_login; 