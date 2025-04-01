INSERT INTO users (email, first_name, last_name, hashed_password)
VALUES (%s, %s, %s, %s)
RETURNING user_id, email, first_name, last_name, last_login; 