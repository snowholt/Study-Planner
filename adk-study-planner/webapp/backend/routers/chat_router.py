"""Chat routes - proxy to ADK backend."""
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
import aiosqlite
import json

from database import get_db
from models import ChatRequest, ChatResponse, ChatSession, ChatSessionCreate
from auth import get_current_user, decrypt_api_key
from config import settings

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("/sessions", response_model=list[ChatSession])
async def get_sessions(
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Get all chat sessions for current user."""
    async with db.execute(
        """SELECT id, title, created_at, updated_at 
           FROM chat_sessions 
           WHERE user_id = ? 
           ORDER BY updated_at DESC""",
        (current_user["id"],)
    ) as cursor:
        rows = await cursor.fetchall()
    
    return [
        ChatSession(
            id=row["id"],
            title=row["title"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )
        for row in rows
    ]


@router.post("/sessions", response_model=ChatSession, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: ChatSessionCreate,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Create a new chat session."""
    async with db.execute(
        """INSERT INTO chat_sessions (user_id, title) 
           VALUES (?, ?) RETURNING id, title, created_at, updated_at""",
        (current_user["id"], data.title or "New Chat")
    ) as cursor:
        row = await cursor.fetchone()
    await db.commit()
    
    return ChatSession(
        id=row["id"],
        title=row["title"],
        created_at=row["created_at"],
        updated_at=row["updated_at"]
    )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Delete a chat session."""
    # Verify ownership
    async with db.execute(
        "SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?",
        (session_id, current_user["id"])
    ) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")
    
    await db.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
    await db.commit()
    
    return {"message": "Session deleted"}


@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: int,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Get all messages in a session."""
    # Verify ownership
    async with db.execute(
        "SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?",
        (session_id, current_user["id"])
    ) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")
    
    async with db.execute(
        """SELECT id, role, content, created_at 
           FROM chat_messages 
           WHERE session_id = ? 
           ORDER BY created_at ASC""",
        (session_id,)
    ) as cursor:
        rows = await cursor.fetchall()
    
    return [
        {
            "id": row["id"],
            "role": row["role"],
            "content": row["content"],
            "created_at": row["created_at"]
        }
        for row in rows
    ]


@router.post("/send", response_model=ChatResponse)
async def send_message(
    data: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Send a message to the ADK agent and get response."""
    
    # Check if user has API key
    if not current_user.get("encrypted_api_key"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please set your Google API key in settings first"
        )
    
    # Get or create session
    session_id = data.session_id
    if not session_id:
        # Create new session with first message as title
        title = data.message[:50] + "..." if len(data.message) > 50 else data.message
        async with db.execute(
            """INSERT INTO chat_sessions (user_id, title) 
               VALUES (?, ?) RETURNING id""",
            (current_user["id"], title)
        ) as cursor:
            row = await cursor.fetchone()
        session_id = row["id"]
        await db.commit()
    else:
        # Verify session ownership
        async with db.execute(
            "SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?",
            (session_id, current_user["id"])
        ) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Session not found")
    
    # Save user message
    await db.execute(
        "INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'user', ?)",
        (session_id, data.message)
    )
    await db.commit()
    
    # Get decrypted API key
    try:
        api_key = decrypt_api_key(current_user["encrypted_api_key"])
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt API key"
        )
    
    # Call ADK backend
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            # ADK web uses a specific API format
            response = await client.post(
                f"{settings.adk_backend_url}/api/v1/run",
                json={
                    "app_name": "study_planner",
                    "user_id": str(current_user["id"]),
                    "session_id": f"session_{session_id}",
                    "new_message": {
                        "role": "user",
                        "parts": [{"text": data.message}]
                    }
                },
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": api_key
                }
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Extract assistant response from ADK format
            assistant_response = ""
            if isinstance(result, list):
                for event in result:
                    if event.get("content") and event.get("content").get("parts"):
                        for part in event["content"]["parts"]:
                            if part.get("text"):
                                assistant_response += part["text"]
            elif isinstance(result, dict):
                if result.get("content") and result.get("content").get("parts"):
                    for part in result["content"]["parts"]:
                        if part.get("text"):
                            assistant_response += part["text"]
                elif result.get("response"):
                    assistant_response = result["response"]
            
            if not assistant_response:
                assistant_response = "I apologize, but I couldn't generate a response. Please try again."
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"ADK backend error: {e.response.text}"
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to ADK backend: {str(e)}"
        )
    
    # Save assistant message
    await db.execute(
        "INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'assistant', ?)",
        (session_id, assistant_response)
    )
    
    # Update session timestamp
    await db.execute(
        "UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (session_id,)
    )
    await db.commit()
    
    return ChatResponse(response=assistant_response, session_id=session_id)
