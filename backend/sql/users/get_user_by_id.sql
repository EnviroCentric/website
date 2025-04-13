SELECT user_id, email, first_name, last_name, created_at, updated_at, last_login
FROM users
WHERE user_id = %s; 