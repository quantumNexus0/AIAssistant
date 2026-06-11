import httpx
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from ..config import OLLAMA_HOST_URL, OLLAMA_TIMEOUT

router = APIRouter(prefix="/api/v1/ai", tags=["AI - NyayaAI Ollama"])

# ══════════════════════════════════════════════════════════════════════════════
#  PYDANTIC MODELS
# ══════════════════════════════════════════════════════════════════════════════

class ChatMessage(BaseModel):
    role: str                   # "user" | "assistant" | "system"
    content: str

class PreviousDecision(BaseModel):
    court_name: str            
    decision_date: str         
    case_number: Optional[str] = None
    decision_summary: str       
    outcome: str                # "favour" | "against" | "partial" | "remand"
    judge_name: Optional[str] = None
    key_observations: Optional[List[str]] = None   
    appeal_filed: Optional[bool] = False
    current_status: Optional[str] = None           

class OllamaChatRequest(BaseModel):
    model: str = "llama3.2"
    messages: List[ChatMessage]
    stream: bool = False
    temperature: Optional[float] = 0.7
    system_prompt: Optional[str] = None

class OllamaGenerateRequest(BaseModel):
    model: str = "llama3.2"
    prompt: str
    stream: bool = False

class UploadedDocument(BaseModel):
    filename: str
    content_type: Optional[str] = None
    size: int
    content_base64: str

class CaseAnalysisRequest(BaseModel):
    model: str = Field(default="llama3.2", description="Ollama model name")
    temperature: Optional[float] = Field(default=0.4, description="Lower = more deterministic legal output")
    case_type: str
    case_description: str
    client_side: str
    jurisdiction_state: Optional[str] = None
    target_court: Optional[str] = None
    petitioner_details: Optional[str] = None
    respondent_details: Optional[str] = None
    previous_decisions: Optional[List[PreviousDecision]] = None
    available_evidence: Optional[List[str]] = None
    key_witnesses: Optional[List[str]] = None
    attached_documents: Optional[List[UploadedDocument]] = None
    missing_documents: Optional[List[str]] = None
    reliefs_sought: Optional[List[str]] = None
    urgency_level: Optional[str] = "normal"
    case_stage: Optional[str] = None
    financial_stakes: Optional[str] = None
    special_circumstances: Optional[str] = None
    opposing_arguments: Optional[str] = None
    language_preference: str = "english"

class DocumentDraftRequest(BaseModel):
    model: str = "llama3.2"
    temperature: Optional[float] = 0.3
    document_type: str
    case_facts: str
    parties: Dict[str, str]
    court_details: str
    specific_prayers: Optional[List[str]] = None
    supporting_documents: Optional[List[UploadedDocument]] = None
    previous_decisions: Optional[List[PreviousDecision]] = None
    advocate_name: Optional[str] = None
    bar_council_number: Optional[str] = None

class ResearchRequest(BaseModel):
    model: str = "llama3.2"
    temperature: Optional[float] = 0.5
    research_query: str
    jurisdiction: Optional[str] = "India"
    case_type_context: Optional[str] = None
    include_recent_judgments: bool = True
    language_preference: str = "english"

# ══════════════════════════════════════════════════════════════════════════════
#  MASTER SYSTEM PROMPTS
# ══════════════════════════════════════════════════════════════════════════════

NYAYA_MASTER_ANALYSIS_PROMPT = """You are NyayaAI — India's most advanced AI legal counsel. You are trained on:
- Indian Penal Code (IPC) / Bharatiya Nyaya Sanhita (BNS) 2023
- Code of Criminal Procedure (CrPC) / Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023
- Code of Civil Procedure (CPC) 1908
- Constitution of India (all Articles, Schedules, and Amendments)
- Evidence Act 1872 / Bharatiya Sakshya Adhiniyam 2023
- Specific Relief Act 1963
- Transfer of Property Act 1882
- Hindu Marriage Act 1955, Hindu Succession Act 1956
- Muslim Personal Law (Shariat) Application Act 1937
- Consumer Protection Act 2019
- POCSO Act 2012
- Domestic Violence Act 2005
- SC/ST (Prevention of Atrocities) Act 1989
- NDPS Act 1985
- Prevention of Corruption Act 1988
- Companies Act 2013
- Income Tax Act 1961, GST laws
- Arbitration and Conciliation Act 1996
- RTI Act 2005
- Motor Vehicles Act 1988
- Environmental Protection Act 1986, NGT Act 2010
- IT Act 2000 and DPDP Act 2023
- All landmark Supreme Court and High Court judgments
- Legal Aid Services Authorities Act 1987
- Bar Council Rules, Professional Ethics

━━━ ANALYSIS MANDATE ━━━

You MUST produce a deeply detailed, structured JSON response. Every field must be populated with actionable, India-specific legal intelligence. Never be vague. Always cite specific sections, sub-sections, articles, and case names with years.

When previous court decisions are provided, you MUST:
1. Analyze what each court held and why
2. Assess whether those decisions help or hurt the current position
3. Identify contradictions between previous orders
4. Advise on how to use favorable orders and counter unfavorable ones
5. Check if any limitation period or appeal window is still open

━━━ MANDATORY OUTPUT FORMAT ━━━

Respond ONLY with this exact JSON structure (no markdown, no preamble):

{
  "analysis_metadata": {
    "generated_at": "ISO timestamp",
    "case_type": "...",
    "client_position": "...",
    "jurisdiction": "...",
    "target_court": "...",
    "case_stage": "...",
    "urgency_level": "...",
    "analysis_confidence": "high/medium/low",
    "disclaimer": "This AI analysis is for informational purposes only and does not constitute legal advice. Consult a qualified advocate before taking any legal action."
  },

  "executive_summary": {
    "case_overview": "Comprehensive 4-6 sentence summary of the entire matter.",
    "client_position_strength": "strong/moderate/weak/mixed",
    "critical_immediate_actions": ["Action 1", "Action 2"],
    "bottom_line": "One sentence: what the client needs to know right now."
  },

  "case_facts_analysis": {
    "established_facts": ["Fact 1", "Fact 2"],
    "disputed_facts": ["Contested fact 1", "Contested fact 2"],
    "assumed_facts": ["Assumption made"],
    "key_dates_timeline": [
      {"date": "DD-MM-YYYY", "event": "What happened", "legal_significance": "Why this matters legally"}
    ],
    "parties_legal_status": {
      "client": "Legal capacity and standing",
      "opposing_party": "Their legal standing and vulnerabilities"
    }
  },

  "legal_issues": [
    {
      "issue_number": 1,
      "issue": "Legal question",
      "category": "procedural/substantive",
      "importance": "critical/high/medium/low",
      "client_position": "Our argument",
      "opposing_position": "Their argument",
      "likely_outcome": "Outcome evaluation"
    }
  ],

  "applicable_laws": [
    {
      "act_name": "Full name of Act",
      "section": "Section number",
      "exact_text": "Key statutory text",
      "applicability": "How it applies",
      "favours": "client/opponent/neutral",
      "punishment_or_relief": "Punishment or relief details",
      "new_law_equivalent": "BNS/BNSS/BSA equivalent if old law",
      "notes": "Important interpretations"
    }
  ],

  "constitutional_provisions": [
    {
      "article": "Article number",
      "title": "Article title",
      "relevance": "How it applies",
      "enforcement_mechanism": "Writ remedy or other"
    }
  ],

  "precedents_and_case_law": {
    "binding_precedents": [
      {
        "case_name": "Full case title",
        "citation": "Citation",
        "court": "Court",
        "year": "YYYY",
        "bench_strength": "Bench size",
        "key_holding": "Holding",
        "ratio_decidendi": "Ratio",
        "applicability_to_case": "Relevance to this case",
        "favours": "client/opponent/neutral"
      }
    ],
    "persuasive_precedents": [
      {
        "case_name": "...",
        "court": "...",
        "year": "...",
        "key_principle": "...",
        "why_persuasion": "...",
        "favours": "client/opponent/neutral"
      }
    ],
    "distinguishable_precedents": [
      {
        "case_name": "...",
        "opponent_will_cite_this": "...",
        "how_to_distinguish": "..."
      }
    ]
  },

  "previous_decisions_analysis": {
    "summary_of_proceedings": "litigation summary",
    "decisions": [
      {
        "court": "Court",
        "date": "Date",
        "what_was_decided": "Summary",
        "legal_effect": "Effect",
        "impact_on_client": "favourable/adverse/neutral",
        "can_be_challenged": true,
        "challenge_mechanism": "Mechanism",
        "limitation_period": "Days remaining",
        "observations_to_leverage": ["Observation"],
        "findings_to_counter": ["Adverse finding"]
      }
    ],
    "overall_litigation_trajectory": "trajectory",
    "res_judicata_concern": "res judicata details",
    "constructive_res_judicata": "constructive details",
    "estoppel_issues": "estoppel details"
  },

  "evidence_analysis": {
    "evidence_strength_overview": "strong/moderate/weak",
    "available_evidence_assessment": [
      {
        "evidence": "Evidence name",
        "type": "type",
        "admissibility": "BSA/Evidence Act section",
        "probative_value": "high/medium/low",
        "concerns": "authenticity details"
      }
    ],
    "critical_missing_evidence": [
      {
        "evidence": "What is missing",
        "importance": "why important",
        "how_to_obtain": "discovery/RTI/etc"
      }
    ],
    "electronic_evidence_compliance": "S65B compliance",
    "expert_witnesses_needed": ["expert type"],
    "adverse_inference_risk": "adverse inference risk details"
  },

  "legal_strategy": {
    "primary_strategy": {
      "approach": "strategy name",
      "description": "strategy description",
      "steps": [
        {"step": 1, "action": "action", "timeline": "timeline", "purpose": "purpose"}
      ],
      "strengths": ["strength"],
      "risks": ["risk"],
      "probability_of_success": "estimate"
    },
    "alternative_strategy": {
      "approach": "alternative",
      "description": "details",
      "steps": [
        {"step": 1, "action": "...", "timeline": "...", "purpose": "..."}
      ]
    },
    "interim_reliefs_strategy": {
      "available_reliefs": ["relief"],
      "recommended_application": "application details",
      "urgency_grounds": "urgency details",
      "balance_of_convenience": "convenience details"
    },
    "settlement_strategy": {
      "advisable": true,
      "optimal_time_to_settle": "timeline",
      "settlement_range": "range",
      "negotiation_leverage": "leverage",
      "mediation_options": "mediation options"
    }
  },

  "procedural_roadmap": {
    "immediate_steps": [
      {
        "action": "action",
        "forum": "court/authority",
        "form_number": "form",
        "court_fee": "fee",
        "timeline": "timeline",
        "documents_needed": ["doc"],
        "legal_basis": "section"
      }
    ],
    "short_term_steps": [
      {
        "action": "...",
        "timeline": "...",
        "dependencies": "..."
      }
    ],
    "long_term_steps": [
      {
        "action": "...",
        "timeline": "...",
        "contingent_on": "..."
      }
    ],
    "limitation_periods": [
      {
        "action": "action",
        "deadline": "deadline date",
        "applicable_law": "section",
        "consequence_of_missing": "consequence",
        "condonation_possible": true
      }
    ]
  },

  "risk_assessment": {
    "overall_risk_score": 0,
    "risk_level": "low/medium/high/critical",
    "risk_breakdown": {
      "legal_risk": {"score": 0, "factors": ["..."]},
      "evidence_risk": {"score": 0, "factors": ["..."]},
      "procedural_risk": {"score": 0, "factors": ["..."]},
      "financial_risk": {"score": 0, "factors": ["..."]},
      "time_risk": {"score": 0, "factors": ["..."]}
    },
    "critical_risks": [
      {
        "risk": "description",
        "probability": "high/medium/low",
        "impact": "high/medium/low",
        "mitigation": "mitigation"
      }
    ],
    "worst_case_scenario": "worst case details",
    "best_case_scenario": "best case details",
    "most_likely_outcome": "probable outcome details"
  },

  "financial_analysis": {
    "estimated_legal_costs": {
      "court_fees": "fees",
      "advocate_fees": "fees",
      "miscellaneous": "misc",
      "total_estimate": "total"
    },
    "financial_stakes": "stakes",
    "cost_benefit_analysis": "analysis",
    "legal_aid_eligibility": "NALSA details"
  },

  "jurisdiction_and_forum": {
    "recommended_forum": "court/tribunal",
    "reason_for_forum": "reason",
    "territorial_jurisdiction": "territorial details",
    "pecuniary_jurisdiction": "pecuniary details",
    "subject_matter_jurisdiction": "subject details",
    "alternative_forums": ["alt"],
    "venue_challenges": "venue challenge details"
  },

  "constitutional_and_human_rights": {
    "fundamental_rights_involved": ["rights"],
    "directive_principles_relevant": ["DPSP"],
    "human_rights_angle": "HRC details",
    "writ_jurisdiction": "writ details"
  },

  "special_considerations": {
    "gender_related_provisions": "details",
    "sc_st_provisions": "details",
    "minor_involved": "details",
    "senior_citizen_provisions": "details",
    "nri_or_foreign_element": "details",
    "media_and_publicity": "details",
    "cybercrime_angle": "details"
  },

  "documents_checklist": {
    "immediately_gather": [
      {"document": "doc", "purpose": "purpose", "from_where": "source"}
    ],
    "file_with_court": [
      {"document": "doc", "copies": "copies", "attestation": "attestation"}
    ],
    "preserve_and_secure": [
      {"document": "doc", "preservation_method": "method"}
    ]
  },

  "opposing_counsel_strategy": {
    "anticipated_arguments": ["arg"],
    "counter_arguments": [
      {"their_argument": "...", "our_counter": "...", "supporting_law": "section/case"}
    ],
    "opponent_weaknesses": ["weakness"],
    "trap_to_avoid": "trap details"
  },

  "estimated_timeline": {
    "best_case_duration": "min time",
    "worst_case_duration": "max time",
    "typical_duration": "typical time",
    "key_milestones": [
      {"milestone": "milestone", "estimated_time_from_now": "time"}
    ],
    "factors_affecting_timeline": ["factor"]
  },

  "advocate_briefing_notes": {
    "key_points_to_stress": ["point"],
    "questions_court_may_ask": ["question"],
    "suggested_answers": [
      {"question": "...", "suggested_answer": "..."}
    ],
    "citations_to_keep_ready": ["citation"],
    "documents_to_mark_as_exhibits": ["exhibit"]
  },

  "recommended_actions": [
    {
      "priority": 1,
      "action": "action description",
      "responsible": "who",
      "deadline": "deadline",
      "consequence_of_inaction": "consequence"
    }
  ],

  "second_opinion_flags": [
    "details"
  ],

  "appeal_options": {
    "if_outcome_unfavourable": [
      {
        "forum": "appellate court",
        "type": "Appeal/Revision/SLP",
        "limitation_period": "time",
        "grounds": ["grounds"],
        "probability_of_success": "success estimate"
      }
    ]
  }
}"""

NYAYA_DOCUMENT_DRAFT_PROMPT = """You are NyayaAI Document Drafter — India's most precise AI legal document drafting system.

You draft court-ready Indian legal documents strictly following:
- Standard formats accepted by Indian courts
- Correct legal language and terminology
- All mandatory clauses and prayer paragraphs
- Proper party descriptions (S/o, D/o, W/o, Age, Address)
- Correct cause title format for the target court
- Proper verification and affidavit clauses
- Vakalatnama formatting requirements
- Court-specific numbering of paragraphs (1, 2, 3... for civil; I, II, III... for some writ petitions)

For documents involving previous court decisions: cite each order in a dedicated "Previous Proceedings" paragraph using standard litigation history format.

Draft the COMPLETE document — no placeholders like "[INSERT]" except where genuinely unknown (marked clearly as [TO BE FILLED]).

Respond ONLY with the complete drafted document text (no JSON, no preamble)."""

NYAYA_RESEARCH_PROMPT = """You are NyayaAI Legal Researcher — an expert in Indian case law, statutes, and legal doctrine.

You provide deep, precise legal research covering:
- Exact statutory provisions with sub-sections
- Landmark Supreme Court judgments with full citations (AIR, SCC, SCR)
- Recent High Court judgments (post-2015 preferred unless seminal older cases)
- Evolution of legal doctrine and judicial interpretation
- Conflicting judgments and which line of authority is stronger
- Dissenting opinions of significance
- Parliamentary intent / statement of objects and reasons
- Comparative law where relevant (UK, US precedents followed by Indian courts)
- Law Commission recommendations
- New laws (BNS 2023, BNSS 2023, BSA 2023) vs old law comparison

Always structure your research response as JSON:
{
  "research_summary": "...",
  "statutory_framework": [...],
  "leading_cases": [...],
  "recent_developments": [...],
  "conflicting_positions": [...],
  "recommended_arguments": [...],
  "bibliography": [...]
}"""

# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def build_analysis_user_message(req: CaseAnalysisRequest) -> str:
    lines = [
        "━━━ CASE ANALYSIS REQUEST ━━━",
        f"Case Type: {req.case_type}",
        f"Client Side: {req.client_side}",
        f"Language: {req.language_preference}",
    ]

    if req.jurisdiction_state:
        lines.append(f"Jurisdiction (State/UT): {req.jurisdiction_state}")
    if req.target_court:
        lines.append(f"Target Court: {req.target_court}")
    if req.case_stage:
        lines.append(f"Case Stage: {req.case_stage}")
    if req.urgency_level:
        lines.append(f"Urgency: {req.urgency_level}")
    if req.financial_stakes:
        lines.append(f"Financial Stakes: {req.financial_stakes}")

    lines += ["", "━━━ CASE FACTS ━━━", req.case_description]

    if req.petitioner_details:
        lines += ["", "PETITIONER/COMPLAINANT DETAILS:", req.petitioner_details]
    if req.respondent_details:
        lines += ["", "RESPONDENT/ACCUSED DETAILS:", req.respondent_details]

    if req.reliefs_sought:
        lines += ["", "RELIEFS SOUGHT:"]
        lines += [f"  • {r}" for r in req.reliefs_sought]

    if req.available_evidence:
        lines += ["", "AVAILABLE EVIDENCE:"]
        lines += [f"  • {e}" for e in req.available_evidence]

    if req.key_witnesses:
        lines += ["", "KEY WITNESSES:"]
        lines += [f"  • {w}" for w in req.key_witnesses]

    if req.attached_documents:
        lines += ["", "ATTACHED SUPPORTING DOCUMENTS:"]
        for doc in req.attached_documents:
            lines += [
                f"  • {doc.filename} ({doc.content_type or 'unknown type'}, {doc.size} bytes)",
                f"    Note: document content is attached in the case record and should be considered by the counsel."
            ]

    if req.missing_documents:
        lines += ["", "MISSING DOCUMENTS (not yet obtained):"]
        lines += [f"  • {d}" for d in req.missing_documents]

    if req.opposing_arguments:
        lines += ["", "OPPOSING ARGUMENTS KNOWN:", req.opposing_arguments]

    if req.special_circumstances:
        lines += ["", "SPECIAL CIRCUMSTANCES:", req.special_circumstances]

    if req.previous_decisions:
        lines += ["", "━━━ PREVIOUS COURT DECISIONS (LITIGATION HISTORY) ━━━"]
        for idx, d in enumerate(req.previous_decisions, 1):
            lines += [
                f"",
                f"Decision #{idx}:",
                f"  Court      : {d.court_name}",
                f"  Date       : {d.decision_date}",
            ]
            if d.case_number:
                lines.append(f"  Case No.   : {d.case_number}")
            if d.judge_name:
                lines.append(f"  Judge      : {d.judge_name}")
            lines += [
                f"  Summary    : {d.decision_summary}",
                f"  Outcome    : {d.outcome}",
            ]
            if d.current_status:
                lines.append(f"  Status     : {d.current_status}")
            if d.appeal_filed is not None:
                lines.append(f"  Appeal     : {'Filed' if d.appeal_filed else 'Not filed'}")
            if d.key_observations:
                lines.append("  Key Observations by Court:")
                for obs in d.key_observations:
                    lines.append(f"    - {obs}")
    else:
        lines += ["", "PREVIOUS DECISIONS: None provided (fresh matter or first filing)."]

    lines += ["", "━━━ END OF CASE DETAILS — PROVIDE COMPLETE JSON ANALYSIS ━━━"]
    return "\n".join(lines)


def build_draft_user_message(req: DocumentDraftRequest) -> str:
    lines = [
        f"Draft a complete {req.document_type.replace('_', ' ').upper()} for the following matter:",
        "",
        f"COURT: {req.court_details}",
        "",
        "PARTIES:",
    ]
    for role, detail in req.parties.items():
        lines.append(f"  {role.upper()}: {detail}")

    if req.advocate_name:
        lines.append(f"\nDRAFTING ADVOCATE: {req.advocate_name}")
    if req.bar_council_number:
        lines.append(f"BAR COUNCIL NO: {req.bar_council_number}")

    lines += ["", "CASE FACTS:", req.case_facts]

    if req.specific_prayers:
        lines += ["", "SPECIFIC PRAYERS TO INCLUDE:"]
        for p in req.specific_prayers:
            lines.append(f"  (a) {p}")

    if req.supporting_documents:
        lines += ["", "SUPPORTING DOCUMENTS ATTACHED FOR REFERENCE:"]
        for doc in req.supporting_documents:
            lines += [
                f"  • {doc.filename} ({doc.content_type or 'unknown type'}, {doc.size} bytes)",
                f"    Note: use attached material as supporting evidence in drafting."
            ]

    if req.previous_decisions:
        lines += ["", "PREVIOUS COURT PROCEEDINGS:"]
        for idx, d in enumerate(req.previous_decisions, 1):
            lines.append(
                f"  {idx}. {d.court_name} on {d.decision_date}"
                f" ({d.case_number or 'unnumbered'}): {d.decision_summary} — Outcome: {d.outcome}"
            )

    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════════════════════
#  UTILITY: CALL OLLAMA
# ══════════════════════════════════════════════════════════════════════════════

async def _call_ollama(model: str, system: str, user_msg: str, temperature: float = 0.4) -> dict:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
        "stream": False,
        "options": {"temperature": temperature},
    }
    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            r = await client.post(f"{OLLAMA_HOST_URL}/api/chat", json=payload)
            r.raise_for_status()
            return r.json()
    except httpx.ConnectError:
        raise HTTPException(503, detail={
            "error": "backend_not_connected",
            "message": "Ollama is offline. Start with: ollama serve",
        })
    except httpx.TimeoutException:
        raise HTTPException(504, detail={"error": "timeout", "message": "Model timed out. Try a smaller model."})


def _extract_and_parse_json(ollama_response: dict):
    """Extract text content from Ollama response and parse it as JSON.
    Returns the parsed object, or the raw text as {"raw": ...} if JSON parsing fails."""
    raw = ""
    if isinstance(ollama_response, dict):
        if "message" in ollama_response and "content" in ollama_response["message"]:
            raw = ollama_response["message"]["content"]
        elif "response" in ollama_response:
            raw = ollama_response["response"]
        else:
            # Already a plain dict (e.g., from a non-Ollama source)
            return ollama_response
    else:
        raw = str(ollama_response)

    # Strip markdown code fences
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        # Return raw text so frontend can display it
        return {"raw_text": raw, "parse_error": "Model did not return valid JSON"}


async def _call_ollama_stream(model: str, system: str, user_msg: str, temperature: float = 0.4):
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
        "stream": True,
        "options": {"temperature": temperature},
    }
    async def gen():
        try:
            async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
                async with client.stream("POST", f"{OLLAMA_HOST_URL}/api/chat", json=payload) as resp:
                    async for chunk in resp.aiter_bytes():
                        yield chunk
        except Exception as e:
            yield json.dumps({"error": "stream_error", "message": str(e)}).encode()
    return gen


# ══════════════════════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/health")
async def ollama_health():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{OLLAMA_HOST_URL}/api/tags")
            if r.status_code == 200:
                data = r.json()
                models = [m["name"] for m in data.get("models", [])]
                return {
                    "status": "connected",
                    "ollama_url": OLLAMA_HOST_URL,
                    "available_models": models,
                    "nyayaai_version": "2.0-advanced",
                    "features": [
                        "full_case_analysis",
                        "previous_decisions_tracking",
                        "document_drafting",
                        "legal_research",
                        "streaming_chat",
                        "risk_scoring",
                        "strategy_builder",
                    ],
                }
    except Exception:
        pass
    return {
        "status": "disconnected",
        "message": "Ollama is not reachable. Start it with: ollama serve",
        "ollama_url": OLLAMA_HOST_URL,
        "available_models": [],
    }


@router.get("/models")
async def list_models():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{OLLAMA_HOST_URL}/api/tags")
            r.raise_for_status()
            data = r.json()
            recommended = {"llama3.1", "llama3.2", "mistral", "qwen", "gemma2", "deepseek"}
            for m in data.get("models", []):
                m["nyayaai_recommended"] = any(rec in m["name"].lower() for rec in recommended)
            return data
    except Exception:
        raise HTTPException(503, "Ollama unavailable. Run: ollama serve")


@router.post("/chat")
async def chat(req: OllamaChatRequest):
    messages = [m.model_dump() for m in req.messages]
    if req.system_prompt:
        messages.insert(0, {"role": "system", "content": req.system_prompt})
    payload = {
        "model": req.model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": req.temperature},
    }
    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            r = await client.post(f"{OLLAMA_HOST_URL}/api/chat", json=payload)
            r.raise_for_status()
            return r.json()
    except httpx.ConnectError:
        raise HTTPException(503, detail={"error": "backend_not_connected", "message": "Ollama is offline."})
    except httpx.TimeoutException:
        raise HTTPException(504, detail={"error": "timeout"})


@router.post("/chat/stream")
async def chat_stream(req: OllamaChatRequest):
    messages = [m.model_dump() for m in req.messages]
    if req.system_prompt:
        messages.insert(0, {"role": "system", "content": req.system_prompt})
    payload = {
        "model": req.model,
        "messages": messages,
        "stream": True,
        "options": {"temperature": req.temperature},
    }
    async def token_generator():
        try:
            async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
                async with client.stream("POST", f"{OLLAMA_HOST_URL}/api/chat", json=payload) as response:
                    async for chunk in response.aiter_bytes():
                        yield chunk
        except Exception as e:
            yield json.dumps({"error": "disconnected", "message": str(e)}).encode()
    return StreamingResponse(token_generator(), media_type="application/x-ndjson")


@router.post("/analyze-case")
async def analyze_case(req: CaseAnalysisRequest):
    user_msg = build_analysis_user_message(req)
    raw = await _call_ollama(
        model=req.model,
        system=NYAYA_MASTER_ANALYSIS_PROMPT,
        user_msg=user_msg,
        temperature=req.temperature or 0.4,
    )
    return _extract_and_parse_json(raw)


@router.post("/analyze-case/stream")
async def analyze_case_stream(req: CaseAnalysisRequest):
    user_msg = build_analysis_user_message(req)
    payload = {
        "model": req.model,
        "messages": [
            {"role": "system", "content": NYAYA_MASTER_ANALYSIS_PROMPT},
            {"role": "user",   "content": user_msg},
        ],
        "stream": True,
        "options": {"temperature": req.temperature or 0.4},
    }
    async def gen():
        try:
            async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
                async with client.stream("POST", f"{OLLAMA_HOST_URL}/api/chat", json=payload) as resp:
                    async for chunk in resp.aiter_bytes():
                        yield chunk
        except Exception as e:
            yield json.dumps({"error": "stream_error", "message": str(e)}).encode()
    return StreamingResponse(gen(), media_type="application/x-ndjson")


@router.post("/draft-document")
async def draft_document(req: DocumentDraftRequest):
    user_msg = build_draft_user_message(req)
    return await _call_ollama(
        model=req.model,
        system=NYAYA_DOCUMENT_DRAFT_PROMPT,
        user_msg=user_msg,
        temperature=req.temperature or 0.3,
    )


@router.post("/research")
async def legal_research(req: ResearchRequest):
    user_msg = (
        f"Research Query: {req.research_query}\n"
        f"Jurisdiction: {req.jurisdiction}\n"
    )
    if req.case_type_context:
        user_msg += f"Area of Law: {req.case_type_context}\n"
    if req.include_recent_judgments:
        user_msg += "Focus: Include post-2015 Supreme Court and High Court judgments prominently.\n"
    user_msg += f"Language: {req.language_preference}"

    return await _call_ollama(
        model=req.model,
        system=NYAYA_RESEARCH_PROMPT,
        user_msg=user_msg,
        temperature=req.temperature or 0.5,
    )


@router.post("/precedents")
async def find_precedents(
    query: str,
    case_type: Optional[str] = None,
    court: Optional[str] = "Supreme Court of India",
    model: str = "llama3.2",
):
    system = (
        "You are NyayaAI Precedent Finder. Return ONLY a valid JSON array of cases (no markdown, no preamble):\n"
        '[{"case_name":"...","citation":"...","court":"...","year":"...","ratio":"...","applicability":"...","favours":"client/opponent/neutral"}]'
    )
    user_msg = f"Find Indian legal precedents for the following legal point: {query}"
    if case_type:
        user_msg += f"\nArea of law: {case_type}"
    if court:
        user_msg += f"\nFocus court: {court}"
    user_msg += "\n\nReturn only the JSON array, nothing else."
    raw = await _call_ollama(model=model, system=system, user_msg=user_msg, temperature=0.3)
    result = _extract_and_parse_json(raw)
    # Ensure we always return an array
    if isinstance(result, list):
        return result
    if isinstance(result, dict) and "cases" in result:
        return result["cases"]
    return result


@router.post("/explain-section")
async def explain_section(
    section: str,
    act: str,
    context: Optional[str] = None,
    language: str = "english",
    model: str = "llama3.2",
):
    system = (
        "You are NyayaAI Section Explainer. For the given Indian legal provision, return ONLY valid JSON (no markdown, no preamble) with exactly these six fields:\n"
        '{"full_text": "...", "plain_language_explanation": "...", "essential_ingredients": "...", '
        '"important_interpretations": "...", "common_scenarios": "...", "new_law_equivalent": "..."}'
    )
    user_msg = f"Explain Section {section} of {act}."
    if context:
        user_msg += f"\nContext/Scenario: {context}"
    user_msg += f"\nRespond in {language}. Return only the JSON object."
    raw = await _call_ollama(model=model, system=system, user_msg=user_msg, temperature=0.3)
    return _extract_and_parse_json(raw)


@router.post("/limitation-check")
async def limitation_check(
    action_type: str,
    event_date: str,
    case_type: Optional[str] = None,
    state: Optional[str] = None,
    model: str = "llama3.2",
):
    system = (
        "You are NyayaAI Limitation Calculator. Given an action type and event date, "
        "determine the limitation period under the Limitation Act 1963 or the specific act. "
        "Return ONLY valid JSON (no markdown, no preamble) with these fields: "
        '{"applicable_law": "...", "period": "...", "deadline": "DD-MM-YYYY", '
        '"time_remaining": "...", "is_within_time": true/false, '
        '"condonation_possible": true/false, "condonation_grounds": "...", '
        '"relevant_article_of_limitation_act": "...", "advice": "..."}'
    )
    user_msg = f"Legal Action: {action_type}\nEvent/Cause of action date: {event_date}"
    if case_type:
        user_msg += f"\nCase type: {case_type}"
    if state:
        user_msg += f"\nState/UT: {state}"
    user_msg += "\nReturn only the JSON object."
    raw = await _call_ollama(model=model, system=system, user_msg=user_msg, temperature=0.2)
    return _extract_and_parse_json(raw)
