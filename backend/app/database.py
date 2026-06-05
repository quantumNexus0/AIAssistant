from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, TEXT
from .config import MONGO_URI, DATABASE_NAME

client = None
db = None


def connect_db():
    """Synchronous connect (called from lifespan startup)."""
    global client, db
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DATABASE_NAME]
    print(f"[NyayaAI] MongoDB connected -> {MONGO_URI}  DB: {DATABASE_NAME}")


def disconnect_db():
    global client
    if client:
        client.close()
        print("[NyayaAI] MongoDB connection closed.")


def get_db():
    return db


async def init_db():
    """
    Create all collections with indexes.
    Safe to call on every startup — MongoDB skips already-existing indexes.
    Collections:
      • cases        — AI Case Analysis reports
      • documents    — Drafted legal documents
      • chats        — Legal chat sessions
      • legal_tools  — Saved legal tool results (section explainer,
                        limitation check, precedent finder)
    """
    database = get_db()

    # ── cases collection ──────────────────────────────────────────────────────
    await database.cases.create_index(
        [("created_at", DESCENDING)],
        name="idx_cases_created_at"
    )
    await database.cases.create_index(
        [("case_type", ASCENDING)],
        name="idx_cases_case_type"
    )
    await database.cases.create_index(
        [("client_side", ASCENDING)],
        name="idx_cases_client_side"
    )
    await database.cases.create_index(
        [("title", TEXT)],
        name="idx_cases_title_text"
    )

    # ── documents collection ──────────────────────────────────────────────────
    await database.documents.create_index(
        [("created_at", DESCENDING)],
        name="idx_documents_created_at"
    )
    await database.documents.create_index(
        [("document_type", ASCENDING)],
        name="idx_documents_doc_type"
    )
    await database.documents.create_index(
        [("title", TEXT)],
        name="idx_documents_title_text"
    )

    # ── chats collection ──────────────────────────────────────────────────────
    await database.chats.create_index(
        [("updated_at", DESCENDING)],
        name="idx_chats_updated_at"
    )
    await database.chats.create_index(
        [("mode", ASCENDING)],
        name="idx_chats_mode"
    )

    # ── legal_tools collection ────────────────────────────────────────────────
    # Stores saved results from section_explainer, limitation_check,
    # and precedent_finder tools.
    await database.legal_tools.create_index(
        [("created_at", DESCENDING)],
        name="idx_legal_tools_created_at"
    )
    await database.legal_tools.create_index(
        [("tool_type", ASCENDING)],
        name="idx_legal_tools_tool_type"
    )
    # Compound index — list by type newest-first (used by the list endpoint)
    await database.legal_tools.create_index(
        [("tool_type", ASCENDING), ("created_at", DESCENDING)],
        name="idx_legal_tools_type_date"
    )
    await database.legal_tools.create_index(
        [("title", TEXT)],
        name="idx_legal_tools_title_text"
    )

    print(
        "[NyayaAI] MongoDB indexes verified for: "
        "cases, documents, chats, legal_tools"
    )