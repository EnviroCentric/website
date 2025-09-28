import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check_users_and_roles():
    # Use DATABASE_URL if available (Docker), otherwise fallback to individual env vars
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        conn = await asyncpg.connect(database_url)
    else:
        conn = await asyncpg.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', 5432),
            user=os.getenv('POSTGRES_USER', os.getenv('DB_USER')),
            password=os.getenv('POSTGRES_PASSWORD', os.getenv('DB_PASS')),
            database=os.getenv('POSTGRES_DB', os.getenv('DB_NAME'))
        )
    
    try:
        # Check users and their roles
        users = await conn.fetch('''
            SELECT 
                u.id, 
                u.first_name, 
                u.last_name, 
                u.is_superuser, 
                u.highest_level,
                COALESCE(MAX(r.level), 0) as actual_max_level,
                string_agg(r.name, ', ') as role_names
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.is_active = true
            GROUP BY u.id, u.first_name, u.last_name, u.is_superuser, u.highest_level
            ORDER BY u.first_name, u.last_name
        ''')
        
        print('Active Users and their roles:')
        print('-' * 100)
        for user in users:
            name = f"{user['first_name']} {user['last_name']}"
            super_status = "Yes" if user['is_superuser'] else "No"
            roles = user['role_names'] or "None"
            print(f"ID: {user['id']:2} | {name:20} | Super: {super_status:3} | Stored: {user['highest_level']:3} | Actual: {user['actual_max_level']:3} | Roles: {roles}")
            
        print('\n' + '='*50)
        print('Roles in system:')
        print('-' * 30)
        roles = await conn.fetch('SELECT name, level FROM roles ORDER BY level DESC')
        for role in roles:
            print(f"{role['name']:15}: Level {role['level']}")
            
        print('\n' + '='*50)  
        print('Testing new employee query with level >= 50:')
        print('-' * 50)
        employees = await conn.fetch('''
            SELECT
              u.id,
              u.first_name,
              u.last_name,
              u.is_superuser,
              u.highest_level,
              COALESCE(MAX(r.level), 0) as max_role_level
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.is_active = true
              AND (
                u.is_superuser = true 
                OR EXISTS (
                  SELECT 1 FROM user_roles ur2 
                  JOIN roles r2 ON ur2.role_id = r2.id 
                  WHERE ur2.user_id = u.id 
                  AND r2.level >= 50
                )
              )
            GROUP BY u.id
            ORDER BY u.first_name, u.last_name
        ''')
        
        print(f"Found {len(employees)} employees with level >= 50:")
        for emp in employees:
            name = f"{emp['first_name']} {emp['last_name']}"
            super_status = "Yes" if emp['is_superuser'] else "No"
            print(f"ID: {emp['id']:2} | {name:20} | Super: {super_status:3} | Max Role Level: {emp['max_role_level']}")
    
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_users_and_roles())