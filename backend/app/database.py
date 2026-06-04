from motor.motor_asyncio import AsyncIOMotorClient
from .config import MONGO_URI, DATABASE_NAME

client = None
db = None

def connect_db():
    global client, db
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DATABASE_NAME]
    print(f"Connected to MongoDB at {MONGO_URI}, DB: {DATABASE_NAME}")

def disconnect_db():
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")

def get_db():
    return db
