from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from ..database import get_db

router = APIRouter(prefix="/api/v1/chats", tags=["Chats History"])

# ══════════════════════════════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class MessageSchema(BaseModel):
    role: str # "user" | "assistant" | "system"
    content: str
    timestamp: Optional[str] = None

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Consultation"
    model: Optional[str] = "llama3.2"
    language: Optional[str] = "en"
    mode: Optional[str] = "general"

class ChatSessionUpdateTitle(BaseModel):
    title: str

# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def serialize_session(session) -> dict:
    if not session:
        return session
    session["id"] = str(session["_id"])
    del session["_id"]
    return session

# ══════════════════════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("")
async def list_chats():
    db = get_db()
    cursor = db.chats.find().sort("updated_at", -1)
    sessions = []
    async for doc in cursor:
        sessions.append(serialize_session(doc))
    return sessions

@router.post("")
async def create_chat(payload: ChatSessionCreate):
    db = get_db()
    new_session = {
        "title": payload.title,
        "model": payload.model,
        "language": payload.language,
        "mode": payload.mode,
        "messages": [],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    result = await db.chats.insert_one(new_session)
    new_session["id"] = str(result.inserted_id)
    del new_session["_id"]
    return new_session

@router.get("/{session_id}")
async def get_chat(session_id: str):
    db = get_db()
    try:
        doc = await db.chats.find_one({"_id": ObjectId(session_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return serialize_session(doc)

@router.post("/{session_id}/messages")
async def add_message(session_id: str, message: MessageSchema):
    db = get_db()
    timestamp = message.timestamp or datetime.utcnow().isoformat()
    msg_dict = {
        "role": message.role,
        "content": message.content,
        "timestamp": timestamp
    }
    try:
        result = await db.chats.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$push": {"messages": msg_dict},
                "$set": {"updated_at": datetime.utcnow().isoformat()}
            }
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return msg_dict

@router.put("/{session_id}/title")
async def update_title(session_id: str, payload: ChatSessionUpdateTitle):
    db = get_db()
    try:
        result = await db.chats.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$set": {
                    "title": payload.title,
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"status": "success", "title": payload.title}

@router.delete("/{session_id}")
async def delete_chat(session_id: str):
    db = get_db()
    try:
        result = await db.chats.delete_one({"_id": ObjectId(session_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return {"status": "success", "message": "Chat session deleted"}
