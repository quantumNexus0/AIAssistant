import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import PORT
from .database import connect_db, disconnect_db
from .routers import ai, chats, cases, documents

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to Database
    connect_db()
    yield
    # Shutdown: Disconnect Database
    disconnect_db()

app = FastAPI(
    title="NyayaAI Backend",
    description="FastAPI full-stack backend with MongoDB for legal chat and document storage.",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(ai.router)
app.include_router(chats.router)
app.include_router(cases.router)
app.include_router(documents.router)

@app.get("/")
async def root():
    return {
        "app": "NyayaAI Legal Assistant API",
        "version": "2.0.0",
        "status": "online"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
