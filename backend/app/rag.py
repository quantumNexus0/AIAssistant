import os
import httpx
import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from .config import OLLAMA_HOST_URL, OLLAMA_TIMEOUT

# Initialize ChromaDB
CHROMA_DB_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

OLLAMA_EMBED_MODEL = "nomic-embed-text"

async def get_ollama_embedding(text: str) -> list[float]:
    """Get embedding from local Ollama."""
    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            r = await client.post(
                f"{OLLAMA_HOST_URL}/api/embeddings",
                json={"model": OLLAMA_EMBED_MODEL, "prompt": text}
            )
            r.raise_for_status()
            data = r.json()
            return data.get("embedding", [])
    except Exception as e:
        print(f"Error getting embedding from Ollama: {e}")
        return []

async def process_and_store_document(session_id: str, filename: str, text: str):
    """Chunk the document and store in ChromaDB for the session."""
    if not text.strip():
        return
        
    # Chunk the text
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = splitter.split_text(text)
    
    if not chunks:
        return
        
    collection_name = f"chat_{session_id}"
    collection = chroma_client.get_or_create_collection(name=collection_name)
    
    embeddings = []
    documents = []
    ids = []
    metadatas = []
    
    for i, chunk in enumerate(chunks):
        emb = await get_ollama_embedding(chunk)
        if emb:
            embeddings.append(emb)
            documents.append(chunk)
            ids.append(f"{filename}_chunk_{i}")
            metadatas.append({"filename": filename, "chunk_index": i})
            
    if embeddings:
        collection.add(
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

async def retrieve_relevant_chunks(session_id: str, query: str, top_k: int = 4) -> list[str]:
    """Retrieve top_k chunks relevant to the query for a specific session."""
    collection_name = f"chat_{session_id}"
    
    try:
        collection = chroma_client.get_collection(name=collection_name)
    except Exception:
        return []
        
    query_embedding = await get_ollama_embedding(query)
    if not query_embedding:
        return []
        
    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        if results and results.get("documents") and results["documents"][0]:
            return results["documents"][0]
        return []
    except Exception as e:
        print(f"Error querying ChromaDB: {e}")
        return []

def delete_session_documents(session_id: str):
    """Delete the entire collection for a session."""
    collection_name = f"chat_{session_id}"
    try:
        chroma_client.delete_collection(name=collection_name)
    except Exception:
        pass

def delete_document_from_session(session_id: str, filename: str):
    """Delete chunks of a specific document from the session's collection."""
    collection_name = f"chat_{session_id}"
    try:
        collection = chroma_client.get_collection(name=collection_name)
        data = collection.get()
        if data and "metadatas" in data and data["metadatas"]:
            ids_to_delete = []
            for id_, meta in zip(data["ids"], data["metadatas"]):
                if meta and meta.get("filename") == filename:
                    ids_to_delete.append(id_)
            
            if ids_to_delete:
                collection.delete(ids=ids_to_delete)
    except Exception:
        pass
