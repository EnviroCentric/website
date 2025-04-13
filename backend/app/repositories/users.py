from sqlalchemy.orm import Session
from app.db.loader import load_sql


def get_user_by_email(db: Session, email: str):
    """
    Get user by email from database.

    Args:
        db: Database session
        email: User's email address

    Returns:
        User object if found, None otherwise
    """
    sql = load_sql("users/get_user_by_email.sql")
    return db.execute(sql, (email,)).fetchone()


def create_user(db: Session, user_data: dict):
    """
    Create a new user in the database.

    Args:
        db: Database session
        user_data: Dictionary containing user data
    """
    sql = load_sql("users/create_user.sql")
    params = (
        user_data["email"],
        user_data["hashed_password"],
        user_data["first_name"],
        user_data["last_name"],
    )
    db.execute(sql, params)
    db.commit()


def get_user_by_id(db: Session, user_id: int):
    """
    Get user by ID from database.

    Args:
        db: Database session
        user_id: User's ID

    Returns:
        User object if found, None otherwise
    """
    sql = load_sql("users/get_user_by_id.sql")
    return db.execute(sql, (user_id,)).fetchone()


def update_user(db: Session, user_id: int, user_data: dict):
    """
    Update user information in the database.

    Args:
        db: Database session
        user_id: User's ID
        user_data: Dictionary containing updated user data
    """
    sql = load_sql("users/update_user.sql")
    params = (
        user_data.get("email"),
        user_data.get("first_name"),
        user_data.get("last_name"),
        user_id,
    )
    db.execute(sql, params)
    db.commit()


def delete_user(db: Session, user_id: int):
    """
    Delete user from database.

    Args:
        db: Database session
        user_id: User's ID
    """
    sql = load_sql("users/delete_user.sql")
    db.execute(sql, (user_id,))
    db.commit()
