from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from app.routers import users
from app.auth.routes import router as auth_router
from app.core.config import settings
from app.db.migrate import run_migrations
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS with environment variables
allowed_origins = settings.ALLOWED_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(users.router, prefix="/api")

# AWS Lambda handler
handler = Mangum(app)


@app.on_event("startup")
async def startup_event():
    """Run migrations on startup."""
    try:
        run_migrations()
        logger.info("Database migrations completed successfully")
    except Exception as e:
        logger.error(f"Error running migrations: {e}")
        raise


@app.get("/")
async def root():
    return {"message": "Welcome to the Project Management API"}


# Only create Lambda handler if running in AWS Lambda
if os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
    try:
        from mangum import Mangum

        handler = Mangum(app, lifespan="off")
    except ImportError:
        pass
