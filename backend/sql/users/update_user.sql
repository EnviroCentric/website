UPDATE users 
SET email = %s,
    first_name = %s,
    last_name = %s
WHERE id = %s; 