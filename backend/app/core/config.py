from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    JWT_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_MINUTES: int

    # CORS
    ALLOWED_ORIGINS: str

    # Admin
    ADMIN_CREATION_SECRET: str

    # Backend
    BACKEND_PORT: int

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
