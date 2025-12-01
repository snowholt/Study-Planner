"""Application configuration."""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from cryptography.fernet import Fernet


class Settings(BaseSettings):
    """Application settings."""
    
    # App
    app_name: str = "ADK Study Planner"
    debug: bool = False
    
    # Security
    secret_key: str = os.getenv("SECRET_KEY", Fernet.generate_key().decode())
    encryption_key: str = os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode())
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./study_planner.db"
    
    # ADK Backend
    adk_backend_url: str = "http://127.0.0.1:8081"
    
    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "https://academy.pinkcodequeen.com"]
    
    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Fernet cipher for API key encryption
fernet = Fernet(settings.encryption_key.encode() if isinstance(settings.encryption_key, str) else settings.encryption_key)
