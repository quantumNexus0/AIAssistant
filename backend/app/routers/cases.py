from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime
from bson import ObjectId
from ..database import get_db

router = APIRouter(prefix="/api/v1/cases", tags=["Case Analyses"])

class CaseSaveRequest(BaseModel):
    title: str
    case_type: str
    client_side: str
    request_data: Dict[str, Any]
    analysis_result: Dict[str, Any]

def serialize_case(case) -> dict:
    if not case:
        return case
    case["id"] = str(case["_id"])
    del case["_id"]
    return case

@router.get("")
async def list_cases():
    db = get_db()
    cursor = db.cases.find().sort("created_at", -1)
    cases = []
    async for doc in cursor:
        cases.append(serialize_case(doc))
    return cases

@router.post("")
async def save_case(payload: CaseSaveRequest):
    db = get_db()
    new_case = {
        "title": payload.title,
        "case_type": payload.case_type,
        "client_side": payload.client_side,
        "request_data": payload.request_data,
        "analysis_result": payload.analysis_result,
        "created_at": datetime.utcnow().isoformat()
    }
    result = await db.cases.insert_one(new_case)
    new_case["id"] = str(result.inserted_id)
    del new_case["_id"]
    return new_case

@router.get("/{case_id}")
async def get_case(case_id: str):
    db = get_db()
    try:
        doc = await db.cases.find_one({"_id": ObjectId(case_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID format")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Case report not found")
    return serialize_case(doc)

@router.delete("/{case_id}")
async def delete_case(case_id: str):
    db = get_db()
    try:
        result = await db.cases.delete_one({"_id": ObjectId(case_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case ID format")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Case report not found")
    return {"status": "success", "message": "Case report deleted"}
