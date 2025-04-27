from typing import List
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator, ConfigDict
import os
import json


class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI Template"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "A FastAPI template with JWT authentication"

    # API Configuration
    API_V1_STR: str = "/api/v1"
    BACKEND_PORT: int = 8000

    # JWT Configuration
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Database Configuration
    DATABASE_URL: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str

    @property
    def get_database_url(self) -> str:
        """Get the database URL based on the environment"""
        if os.environ.get("TESTING") == "True":
            return "postgresql://temp:temp@db:5432/test_db"
        return self.DATABASE_URL

    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = []

    @field_validator("ALLOWED_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        raise ValueError(v)

    model_config = ConfigDict(case_sensitive=True, env_file=".env")


settings = Settings()
