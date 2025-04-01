from fastapi import Depends
from jwtdown_fastapi.authentication import Authenticator
from passlib.context import CryptContext
from repositories.users import UsersRepository

# to get a string like this run:
# openssl rand -hex 32
SECRET = "YOUR_SECRET_HERE"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class MyAuthenticator(Authenticator):
    async def get_account_data(
        self,
        username: str,  # jwtdown-fastapi expects this to be named username
        accounts: UsersRepository,
    ):
        # Use your repo to get the account based on the email
        # The username parameter is actually the email in our case
        return accounts.get_user(username)

    def get_account_getter(
        self,
        accounts: UsersRepository = Depends(),
    ):
        # Return the accounts. That's it.
        return accounts

    def get_hashed_password(self, account):
        # Return the encrypted password value from your account object
        return account.hashed_password

    def get_account_data_for_cookie(self, account):
        # Return the email and the data for the cookie.
        # You must return TWO values from this method.
        return account.email, {
            "user_id": account.user_id,
            "email": account.email,
            "first_name": account.first_name,
            "last_name": account.last_name,
        }

    def hash_password(self, password: str):
        return pwd_context.hash(password)


authenticator = MyAuthenticator(SECRET)
