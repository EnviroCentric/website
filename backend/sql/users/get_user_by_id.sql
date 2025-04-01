SELECT user_id, email, first_name, last_name, last_login
FROM users
WHERE user_id = %s; 