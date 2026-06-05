from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from datetime import datetime
from bson import ObjectId
from ..database import get_db

router = APIRouter(prefix="/api/v1/cases", tags=["Case Analyses"])


# ══════════════════════════════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class CaseSaveRequest(BaseModel):
    title: str
    case_type: str                          # criminal / civil / family / …
    client_side: str                        # petitioner / respondent / accused …
    jurisdiction_state: Optional[str] = None
    target_court: Optional[str] = None
    urgency_level: Optional[str] = "normal"
    case_stage: Optional[str] = None
    request_data: Dict[str, Any]            # full form payload sent to AI
    analysis_result: Dict[str, Any]         # structured JSON returned by AI
    risk_level: Optional[str] = None        # extracted from analysis for quick filter
    client_position_strength: Optional[str] = None


class CaseUpdateRequest(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None             # advocate's personal notes on the case


# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def serialize_case(case: dict) -> dict:
    if not case:
        return case
    case["id"] = str(case["_id"])
    del case["_id"]
    return case


def _extract_meta(analysis_result: dict) -> dict:
    """Pull quick-filter fields out of the AI JSON so we can index them."""
    risk = None
    strength = None
    try:
        risk = analysis_result.get("risk_assessment", {}).get("risk_level")
        strength = analysis_result.get("executive_summary", {}).get("client_position_strength")
    except Exception:
        pass
    return {"risk_level": risk, "client_position_strength": strength}


# ══════════════════════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("")
async def list_cases(
    case_type: Optional[str] = Query(None, description="Filter by case type"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    """List all saved AI Case Analysis reports, newest first."""
    db = get_db()
    query: Dict[str, Any] = {}
    if case_type:
        query["case_type"] = case_type
    if risk_level:
        query["risk_level"] = risk_level

    cursor = db.cases.find(query, {
        "title": 1, "case_type": 1, "client_side": 1,
        "jurisdiction_state": 1, "target_court": 1,
        "risk_level": 1, "client_position_strength": 1,
        "urgency_level": 1, "case_stage": 1,
        "created_at": 1, "updated_at": 1,
    }).sort("created_at", -1).skip(skip).limit(limit)

    cases = []
    async for doc in cursor:
        cases.append(serialize_case(doc))
    return cases


@router.post("", status_code=201)
async def save_case(payload: CaseSaveRequest):
    """Save an AI Case Analysis result to the `cases` collection."""
    db = get_db()
    meta = _extract_meta(payload.analysis_result)
    now = datetime.utcnow().isoformat()

    new_case = {
        "title": payload.title,
        "case_type": payload.case_type,
        "client_side": payload.client_side,
        "jurisdiction_state": payload.jurisdiction_state,
        "target_court": payload.target_court,
        "urgency_level": payload.urgency_level,
        "case_stage": payload.case_stage,
        "risk_level": payload.risk_level or meta["risk_level"],
        "client_position_strength": payload.client_position_strength or meta["client_position_strength"],
        "request_data": payload.request_data,
        "analysis_result": payload.analysis_result,
        "notes": "",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.cases.insert_one(new_case)
    new_case["id"] = str(result.inserted_id)
    del new_case["_id"]
    return new_case


@router.get("/stats")
async def case_stats():
    """Aggregate statistics for the dashboard."""
    db = get_db()
    total = await db.cases.count_documents({})
    pipeline = [
        {"$group": {"_id": "$case_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    by_type = []
    async for doc in db.cases.aggregate(pipeline):
        by_type.append({"case_type": doc["_id"], "count": doc["count"]})

    risk_pipeline = [
        {"$group": {"_id": "$risk_level", "count": {"$sum": 1}}},
    ]
    by_risk = []
    async for doc in db.cases.aggregate(risk_pipeline):
        by_risk.append({"risk_level": doc["_id"], "count": doc["count"]})

    return {"total_cases": total, "by_case_type": by_type, "by_risk_level": by_risk}


@router.get("/{case_id}")
async def get_case(case_id: str):
    """Get a single case analysis by ID (full document)."""
    db = get_db()
    try:
        doc = await db.cases.find_one({"_id": ObjectId(case_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID format")
    if not doc:
        raise HTTPException(status_code=404, detail="Case report not found")
    return serialize_case(doc)


@router.patch("/{case_id}")
async def update_case(case_id: str, payload: CaseUpdateRequest):
    """Update title or advocate notes on a saved case."""
    db = get_db()
    updates: Dict[str, Any] = {"updated_at": datetime.utcnow().isoformat()}
    if payload.title is not None:
        updates["title"] = payload.title
    if payload.notes is not None:
        updates["notes"] = payload.notes
    try:
        result = await db.cases.update_one(
            {"_id": ObjectId(case_id)},
            {"$set": updates}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID format")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case report not found")
    return {"status": "success", "updated_fields": list(updates.keys())}


@router.delete("/{case_id}")
async def delete_case(case_id: str):
    """Permanently delete a case analysis."""
    db = get_db()
    try:
        result = await db.cases.delete_one({"_id": ObjectId(case_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID format")
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Case report not found")
    return {"status": "success", "message": "Case report deleted"}
