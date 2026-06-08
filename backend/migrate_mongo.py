import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

COLLECTIONS = ["cases", "documents", "chats", "legal_tools"]


def get_client(uri):
    if not uri:
        raise ValueError("MongoDB URI is required.")
    return MongoClient(uri)


def migrate_collection(source_db, target_db, collection_name):
    source = source_db[collection_name]
    target = target_db[collection_name]

    print(f"Migrating collection '{collection_name}'...")
    count = 0
    for doc in source.find():
        target.replace_one({"_id": doc["_id"]}, doc, upsert=True)
        count += 1

    print(f"  Migrated {count} documents into '{collection_name}'.")


if __name__ == "__main__":
    source_uri = os.getenv("SOURCE_MONGO_URI")
    source_db_name = os.getenv("SOURCE_DATABASE_NAME")
    target_uri = os.getenv("MONGO_URI")
    target_db_name = os.getenv("DATABASE_NAME", "NyayaAI")

    if not target_uri:
        raise SystemExit("Error: set MONGO_URI in environment before running this script.")

    source_client = None
    if source_uri and source_db_name:
        source_client = get_client(source_uri)
    else:
        raise SystemExit(
            "Error: set SOURCE_MONGO_URI and SOURCE_DATABASE_NAME to migrate data from another database."
        )

    target_client = get_client(target_uri)
    source_db = source_client[source_db_name]
    target_db = target_client[target_db_name]

    for collection_name in COLLECTIONS:
        migrate_collection(source_db, target_db, collection_name)

    print("\nData migration complete.")
