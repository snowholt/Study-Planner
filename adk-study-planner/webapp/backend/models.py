"""Pydantic models for request/response schemas."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# Auth models
class UserCreate(BaseModel):
    """User registration schema."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    """User login schema."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response schema."""
    id: int
    email: str
    username: str
    has_api_key: bool
    created_at: str


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Settings models
class ApiKeyUpdate(BaseModel):
    """API key update schema."""
    api_key: str = Field(..., min_length=10)


class PasswordUpdate(BaseModel):
    """Password update schema."""
    current_password: str
    new_password: str = Field(..., min_length=8)


# Chat models
class ChatMessage(BaseModel):
    """Chat message schema."""
    role: str  # 'user' or 'assistant'
    content: str


class ChatSession(BaseModel):
    """Chat session schema."""
    id: int
    title: str
    created_at: str
    updated_at: str


class ChatSessionCreate(BaseModel):
    """Create chat session schema."""
    title: Optional[str] = "New Chat"


class ChatRequest(BaseModel):
    """Chat request to ADK."""
    message: str
    session_id: Optional[int] = None


class ChatResponse(BaseModel):
    """Chat response from ADK."""
    response: str
    session_id: int
