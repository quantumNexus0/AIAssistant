from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from datetime import datetime
from bson import ObjectId
from ..database import get_db

router = APIRouter(prefix="/api/v1/documents", tags=["Drafted Documents"])


# ══════════════════════════════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class DocumentSaveRequest(BaseModel):
    title: str
    document_type: str                          # bail_application / plaint / …
    parties: Dict[str, str]                     # {petitioner: "…", respondent: "…"}
    court_details: Optional[str] = None
    advocate_name: Optional[str] = None
    bar_council_number: Optional[str] = None
    draft_text: str                             # the full generated document text
    word_count: Optional[int] = None
    attachments: Optional[List[Dict[str, Any]]] = None


class DocumentUpdateRequest(BaseModel):
    title: Optional[str] = None
    draft_text: Optional[str] = None           # in-app editing support
    notes: Optional[str] = None


# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def serialize_doc(doc: dict) -> dict:
    if not doc:
        return doc
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


# ══════════════════════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("")
async def list_documents(
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    """List all saved drafted documents, newest first."""
    db = get_db()
    query: Dict[str, Any] = {}
    if document_type:
        query["document_type"] = document_type

    cursor = db.documents.find(query, {
        "title": 1, "document_type": 1, "parties": 1,
        "court_details": 1, "advocate_name": 1,
        "word_count": 1, "created_at": 1, "updated_at": 1,
    }).sort("created_at", -1).skip(skip).limit(limit)

    docs = []
    async for doc in cursor:
        docs.append(serialize_doc(doc))
    return docs


@router.post("", status_code=201)
async def save_document(payload: DocumentSaveRequest):
    """Save a drafted legal document to the `documents` collection."""
    db = get_db()
    now = datetime.utcnow().isoformat()
    word_count = payload.word_count or len(payload.draft_text.split())

    new_doc = {
        "title": payload.title,
        "document_type": payload.document_type,
        "parties": payload.parties,
        "court_details": payload.court_details,
        "advocate_name": payload.advocate_name,
        "bar_council_number": payload.bar_council_number,
        "draft_text": payload.draft_text,
        "word_count": word_count,
        "attachments": payload.attachments or [],
        "notes": "",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.documents.insert_one(new_doc)
    new_doc["id"] = str(result.inserted_id)
    del new_doc["_id"]
    return new_doc


@router.get("/stats")
async def document_stats():
    """Aggregate statistics — count by document type."""
    db = get_db()
    total = await db.documents.count_documents({})
    pipeline = [
        {"$group": {"_id": "$document_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    by_type = []
    async for doc in db.documents.aggregate(pipeline):
        by_type.append({"document_type": doc["_id"], "count": doc["count"]})
    return {"total_documents": total, "by_document_type": by_type}


@router.get("/{doc_id}")
async def get_document(doc_id: str):
    """Get a single drafted document by ID (full document including draft_text)."""
    db = get_db()
    try:
        doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize_doc(doc)


@router.patch("/{doc_id}")
async def update_document(doc_id: str, payload: DocumentUpdateRequest):
    """Edit the title, draft text, or add notes to a saved document."""
    db = get_db()
    updates: Dict[str, Any] = {"updated_at": datetime.utcnow().isoformat()}
    if payload.title is not None:
        updates["title"] = payload.title
    if payload.draft_text is not None:
        updates["draft_text"] = payload.draft_text
        updates["word_count"] = len(payload.draft_text.split())
    if payload.notes is not None:
        updates["notes"] = payload.notes
    try:
        result = await db.documents.update_one(
            {"_id": ObjectId(doc_id)},
            {"$set": updates}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "success", "updated_fields": list(updates.keys())}


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Permanently delete a drafted document."""
    db = get_db()
    try:
        result = await db.documents.delete_one({"_id": ObjectId(doc_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID format")
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "success", "message": "Document deleted"}
