import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import PORT
from .database import connect_db, disconnect_db, init_db
from .routers import ai, chats, cases, documents, legal_tools


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────────
    connect_db()
    await init_db()   # create indexes for cases, documents, chats collections
    yield
    # ── Shutdown ───────────────────────────────────────────────────────────────
    disconnect_db()


app = FastAPI(
    title="NyayaAI Backend",
    description="FastAPI backend with MongoDB — AI Case Analysis, Document Drafting & Legal Chat.",
    version="2.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(ai.router)
app.include_router(chats.router)
app.include_router(cases.router)
app.include_router(documents.router)
app.include_router(legal_tools.router)


@app.get("/")
async def root():
    return {
        "app": "NyayaAI Legal Assistant API",
        "version": "2.1.0",
        "status": "online",
        "collections": ["cases", "documents", "chats"],
    }


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
