from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Any, Dict, List
from datetime import datetime
from bson import ObjectId
from ..database import get_db

router = APIRouter(prefix="/api/v1/legal-tools", tags=["Legal Tools History"])


# ══════════════════════════════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class LegalToolSaveRequest(BaseModel):
    tool_type: str          # "section_explainer" | "limitation_check" | "precedent_finder"
    title: str              # human-readable title for the sidebar
    query_params: Dict[str, Any]   # the input the user submitted
    result: Any             # parsed JSON or list from AI


# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def serialize(doc: dict) -> dict:
    if not doc:
        return doc
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


# ══════════════════════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("")
async def list_tool_results(
    tool_type: Optional[str] = Query(None, description="Filter: section_explainer | limitation_check | precedent_finder"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    """List saved legal tool results, newest first."""
    db = get_db()
    query: Dict[str, Any] = {}
    if tool_type:
        query["tool_type"] = tool_type

    cursor = db.legal_tools.find(query, {
        "tool_type": 1, "title": 1, "query_params": 1, "created_at": 1
    }).sort("created_at", -1).skip(skip).limit(limit)

    results = []
    async for doc in cursor:
        results.append(serialize(doc))
    return results


@router.post("", status_code=201)
async def save_tool_result(payload: LegalToolSaveRequest):
    """Persist a legal tool result to the legal_tools collection."""
    db = get_db()
    now = datetime.utcnow().isoformat()
    new_doc = {
        "tool_type": payload.tool_type,
        "title": payload.title,
        "query_params": payload.query_params,
        "result": payload.result,
        "created_at": now,
    }
    result = await db.legal_tools.insert_one(new_doc)
    new_doc["id"] = str(result.inserted_id)
    del new_doc["_id"]
    return new_doc


@router.get("/stats")
async def tool_stats():
    """Count by tool type."""
    db = get_db()
    total = await db.legal_tools.count_documents({})
    pipeline = [
        {"$group": {"_id": "$tool_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    by_type = []
    async for doc in db.legal_tools.aggregate(pipeline):
        by_type.append({"tool_type": doc["_id"], "count": doc["count"]})
    return {"total": total, "by_tool_type": by_type}


@router.get("/{record_id}")
async def get_tool_result(record_id: str):
    """Get a single saved legal tool result (full result field)."""
    db = get_db()
    try:
        doc = await db.legal_tools.find_one({"_id": ObjectId(record_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid record ID format")
    if not doc:
        raise HTTPException(status_code=404, detail="Record not found")
    return serialize(doc)


@router.delete("/{record_id}")
async def delete_tool_result(record_id: str):
    """Delete a saved legal tool result."""
    db = get_db()
    try:
        result = await db.legal_tools.delete_one({"_id": ObjectId(record_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid record ID format")
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"status": "success", "message": "Record deleted"}
