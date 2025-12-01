"""Authentication utilities."""
from datetime import datetime, timedelta
from typing import Optional
import aiosqlite
import bcrypt

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import settings, fernet
from database import get_db

# Bearer token security
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return bcrypt.hashpw(
        password.encode('utf-8'), 
        bcrypt.gensalt()
    ).decode('utf-8')


def encrypt_api_key(api_key: str) -> str:
    """Encrypt an API key using Fernet."""
    return fernet.encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt an API key using Fernet."""
    return fernet.decrypt(encrypted_key.encode()).decode()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: aiosqlite.Connection = Depends(get_db)
) -> dict:
    """Get the current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except JWTError:
        raise credentials_exception
    except (ValueError, TypeError):
        raise credentials_exception
    
    async with db.execute(
        "SELECT id, email, username, encrypted_api_key, created_at FROM users WHERE id = ?",
        (user_id,)
    ) as cursor:
        row = await cursor.fetchone()
    
    if row is None:
        raise credentials_exception
    
    return {
        "id": row["id"],
        "email": row["email"],
        "username": row["username"],
        "encrypted_api_key": row["encrypted_api_key"],
        "has_api_key": row["encrypted_api_key"] is not None,
        "created_at": row["created_at"]
    }
