"""User settings routes."""
from fastapi import APIRouter, Depends, HTTPException, status
import aiosqlite

from database import get_db
from models import ApiKeyUpdate, PasswordUpdate, UserResponse
from auth import (
    get_password_hash,
    verify_password,
    encrypt_api_key,
    get_current_user
)

router = APIRouter(prefix="/user", tags=["User Settings"])


@router.put("/api-key")
async def update_api_key(
    data: ApiKeyUpdate,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Update user's Google API key (stored encrypted)."""
    encrypted_key = encrypt_api_key(data.api_key)
    
    await db.execute(
        "UPDATE users SET encrypted_api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (encrypted_key, current_user["id"])
    )
    await db.commit()
    
    return {"message": "API key updated successfully"}


@router.delete("/api-key")
async def delete_api_key(
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Delete user's stored API key."""
    await db.execute(
        "UPDATE users SET encrypted_api_key = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (current_user["id"],)
    )
    await db.commit()
    
    return {"message": "API key deleted successfully"}


@router.put("/password")
async def update_password(
    data: PasswordUpdate,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Update user's password."""
    # Get current password hash
    async with db.execute(
        "SELECT hashed_password FROM users WHERE id = ?",
        (current_user["id"],)
    ) as cursor:
        row = await cursor.fetchone()
    
    if not verify_password(data.current_password, row["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    new_hash = get_password_hash(data.new_password)
    await db.execute(
        "UPDATE users SET hashed_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (new_hash, current_user["id"])
    )
    await db.commit()
    
    return {"message": "Password updated successfully"}


@router.delete("/account")
async def delete_account(
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Delete user account and all associated data."""
    await db.execute("DELETE FROM users WHERE id = ?", (current_user["id"],))
    await db.commit()
    
    return {"message": "Account deleted successfully"}
