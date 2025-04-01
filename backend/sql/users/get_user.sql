SELECT user_id, email, hashed_password, first_name, last_name
FROM users
WHERE email = %s; 