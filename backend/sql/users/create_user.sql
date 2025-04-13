INSERT INTO users (email, first_name, last_name, hashed_password)
VALUES (%s, %s, %s, %s)
RETURNING user_id, email, first_name, last_name, created_at, updated_at, last_login; 