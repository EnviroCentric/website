import argparse
import sys
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash


def create_superuser(
    db: Session, email: str, password: str, first_name: str, last_name: str
) -> User:
    """
    Create a superuser in the database
    """
    # Check if user already exists
    user = db.query(User).filter(User.email == email).first()
    if user:
        print(f"User with email {email} already exists")
        sys.exit(1)

    # Create new superuser
    db_user = User(
        email=email,
        hashed_password=get_password_hash(password),
        first_name=first_name,
        last_name=last_name,
        is_superuser=True,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def main():
    parser = argparse.ArgumentParser(description="Create a superuser")
    parser.add_argument("--email", required=True, help="Email of the superuser")
    parser.add_argument("--password", required=True, help="Password of the superuser")
    parser.add_argument(
        "--first-name", required=True, help="First name of the superuser"
    )
    parser.add_argument("--last-name", required=True, help="Last name of the superuser")

    args = parser.parse_args()

    db = SessionLocal()
    try:
        user = create_superuser(
            db=db,
            email=args.email,
            password=args.password,
            first_name=args.first_name,
            last_name=args.last_name,
        )
        print(f"Superuser created successfully with email: {user.email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
