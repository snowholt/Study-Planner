"""Authentication routes."""
from fastapi import APIRouter, Depends, HTTPException, status
import aiosqlite

from database import get_db
from models import UserCreate, UserLogin, UserResponse, Token
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: aiosqlite.Connection = Depends(get_db)):
    """Register a new user."""
    # Check if email exists
    async with db.execute(
        "SELECT id FROM users WHERE email = ?", (user_data.email,)
    ) as cursor:
        if await cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Check if username exists
    async with db.execute(
        "SELECT id FROM users WHERE username = ?", (user_data.username,)
    ) as cursor:
        if await cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    async with db.execute(
        """INSERT INTO users (email, username, hashed_password) 
           VALUES (?, ?, ?) RETURNING id, email, username, encrypted_api_key, created_at""",
        (user_data.email, user_data.username, hashed_password)
    ) as cursor:
        row = await cursor.fetchone()
    await db.commit()
    
    # Create token
    access_token = create_access_token(data={"sub": str(row["id"])})
    
    return Token(
        access_token=access_token,
        user=UserResponse(
            id=row["id"],
            email=row["email"],
            username=row["username"],
            has_api_key=False,
            created_at=row["created_at"]
        )
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: aiosqlite.Connection = Depends(get_db)):
    """Login user and return token."""
    async with db.execute(
        "SELECT id, email, username, hashed_password, encrypted_api_key, created_at FROM users WHERE email = ?",
        (credentials.email,)
    ) as cursor:
        user = await cursor.fetchone()
    
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create token
    access_token = create_access_token(data={"sub": str(user["id"])})
    
    return Token(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            username=user["username"],
            has_api_key=user["encrypted_api_key"] is not None,
            created_at=user["created_at"]
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info."""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        username=current_user["username"],
        has_api_key=current_user["has_api_key"],
        created_at=current_user["created_at"]
    )
