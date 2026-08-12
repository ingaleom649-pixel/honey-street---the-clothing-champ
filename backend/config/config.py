"""Application configuration loaded from environment variables."""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from the project root .env file
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


class Config:
    """Base configuration."""

    # Secret keys from environment (never hardcoded)
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me")

    # JWT access token lifetime
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", 120))
    )

    # Database URL (SQLite default; switch to PostgreSQL/MySQL by overriding DATABASE_URL)
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "sqlite:///honeystreet.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Admin bootstrap
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@honeystreet.com")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@123")
    ADMIN_NAME = os.getenv("ADMIN_NAME", "Honeystreet Admin")

    # Social / professional profiles
    LINKEDIN_URL = os.getenv(
        "LINKEDIN_URL", "https://www.linkedin.com/in/om-ingale-874a53427"
    )
    INSTAGRAM_URL = os.getenv("INSTAGRAM_URL", "https://www.instagram.com/")
    GITHUB_URL = os.getenv("GITHUB_URL", "https://github.com/")

    # Payment placeholders
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
    STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")

    # CORS origins (frontend dev server / file serving)
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

    # Security
    JWT_ERROR_MESSAGE_KEY = "message"
    JWT_TOKEN_LOCATION = ["headers"]
