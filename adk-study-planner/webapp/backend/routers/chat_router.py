"""Chat routes - proxy to ADK backend."""
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
import aiosqlite
import json

from database import get_db
from models import ChatRequest, ChatResponse, ChatSession, ChatSessionCreate, GuestChatRequest, GuestChatResponse
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
    
    # Set the API key as environment variable for the ADK agent
    import os
    os.environ["GOOGLE_API_KEY"] = api_key
    
    # Call ADK backend
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            # First, create a session in ADK
            adk_user_id = f"user_{current_user['id']}"
            session_response = await client.post(
                f"{settings.adk_backend_url}/apps/study_planner/users/{adk_user_id}/sessions",
                json={},
                headers={"Content-Type": "application/json"}
            )
            session_response.raise_for_status()
            session_data = session_response.json()
            adk_session_id = session_data.get("id")
            
            if not adk_session_id:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to create ADK session"
                )
            
            # Now send the message using run_sse endpoint
            response = await client.post(
                f"{settings.adk_backend_url}/run_sse",
                json={
                    "app_name": "study_planner",
                    "user_id": adk_user_id,
                    "session_id": adk_session_id,
                    "new_message": {
                        "role": "user",
                        "parts": [{"text": data.message}]
                    }
                },
                headers={"Content-Type": "application/json"},
                timeout=300.0
            )
            response.raise_for_status()
            
            # Parse SSE response - each line starts with "data: "
            assistant_response = ""
            for line in response.text.split("\n"):
                if line.startswith("data: "):
                    try:
                        event_data = json.loads(line[6:])  # Remove "data: " prefix
                        if event_data.get("content") and event_data.get("content").get("parts"):
                            for part in event_data["content"]["parts"]:
                                if part.get("text"):
                                    assistant_response += part["text"] + "\n\n"
                    except json.JSONDecodeError:
                        continue
            
            if not assistant_response:
                assistant_response = "I apologize, but I couldn't generate a response. Please try again."
            else:
                assistant_response = assistant_response.strip()
            
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


@router.post("/guest", response_model=GuestChatResponse)
async def guest_chat(data: GuestChatRequest):
    """Send a message as a guest user (no account required).
    
    The API key is provided in the request and not stored.
    Conversation history is managed client-side.
    """
    import os
    import uuid
    
    # Set the API key as environment variable for the ADK agent
    os.environ["GOOGLE_API_KEY"] = data.api_key
    
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            # Generate a unique guest session ID per request or use a stable one
            guest_user_id = "guest"
            
            # First, create a session in ADK
            session_response = await client.post(
                f"{settings.adk_backend_url}/apps/study_planner/users/{guest_user_id}/sessions",
                json={},
                headers={"Content-Type": "application/json"}
            )
            session_response.raise_for_status()
            session_data = session_response.json()
            adk_session_id = session_data.get("id")
            
            if not adk_session_id:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to create ADK session"
                )
            
            # Now send the message using run_sse endpoint
            response = await client.post(
                f"{settings.adk_backend_url}/run_sse",
                json={
                    "app_name": "study_planner",
                    "user_id": guest_user_id,
                    "session_id": adk_session_id,
                    "new_message": {
                        "role": "user",
                        "parts": [{"text": data.message}]
                    }
                },
                headers={"Content-Type": "application/json"},
                timeout=300.0
            )
            response.raise_for_status()
            
            # Parse SSE response - each line starts with "data: "
            assistant_response = ""
            for line in response.text.split("\n"):
                if line.startswith("data: "):
                    try:
                        event_data = json.loads(line[6:])  # Remove "data: " prefix
                        if event_data.get("content") and event_data.get("content").get("parts"):
                            for part in event_data["content"]["parts"]:
                                if part.get("text"):
                                    assistant_response += part["text"] + "\n\n"
                    except json.JSONDecodeError:
                        continue
            
            if not assistant_response:
                assistant_response = "I apologize, but I couldn't generate a response. Please try again."
            else:
                assistant_response = assistant_response.strip()
            
    except httpx.HTTPStatusError as e:
        error_detail = "ADK backend error"
        try:
            error_detail = e.response.text
        except:
            pass
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error communicating with AI: {error_detail}"
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to AI service: {str(e)}"
        )
    
    return GuestChatResponse(response=assistant_response)
