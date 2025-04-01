SELECT user_id, first_name, last_name, email, created_at, updated_at, last_login
FROM users
WHERE email = %s; 