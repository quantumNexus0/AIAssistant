import os

OLLAMA_HOST_URL = os.getenv("OLLAMA_HOST_URL", "http://localhost:11434")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "nyaya_ai")
PORT = int(os.getenv("PORT", "8000"))
OLLAMA_TIMEOUT = 600.0   # 10 minutes — large models (deepseek, llama3.1:70b) need more time
