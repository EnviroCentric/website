SELECT EXISTS(
    SELECT 1 FROM users WHERE LOWER(email) = LOWER(%s)
) as exists; 