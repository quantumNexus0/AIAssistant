from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime
from bson import ObjectId
from ..database import get_db

router = APIRouter(prefix="/api/v1/documents", tags=["Drafted Documents"])

class DocumentSaveRequest(BaseModel):
    title: str
    document_type: str
    parties: Dict[str, str]
    court_details: Optional[str] = None
    draft_text: str

def serialize_doc(doc) -> dict:
    if not doc:
        return doc
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

@router.get("")
async def list_documents():
    db = get_db()
    cursor = db.documents.find().sort("created_at", -1)
    docs = []
    async for doc in cursor:
        docs.append(serialize_doc(doc))
    return docs

@router.post("")
async def save_document(payload: DocumentSaveRequest):
    db = get_db()
    new_doc = {
        "title": payload.title,
        "document_type": payload.document_type,
        "parties": payload.parties,
        "court_details": payload.court_details,
        "draft_text": payload.draft_text,
        "created_at": datetime.utcnow().isoformat()
    }
    result = await db.documents.insert_one(new_doc)
    new_doc["id"] = str(result.inserted_id)
    del new_doc["_id"]
    return new_doc

@router.get("/{doc_id}")
async def get_document(doc_id: str):
    db = get_db()
    try:
        doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize_doc(doc)

@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    db = get_db()
    try:
        result = await db.documents.delete_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "success", "message": "Document deleted"}
