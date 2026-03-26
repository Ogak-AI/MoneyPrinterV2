import sqlite3
import os
from config import ROOT_DIR

DB_PATH = os.path.abspath(os.path.join(ROOT_DIR, ".mp", "users.db"))

def init_db():
    print(f"DEBUG: Initializing database at absolute path: {DB_PATH}")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    
    # Verify table existence
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
    table_exists = cursor.fetchone()
    if table_exists:
        print("DEBUG: Table 'users' verified in database.")
    else:
        print("DEBUG: ERROR - Table 'users' NOT found after creation.")
        
    conn.close()
    print("DEBUG: Database connection closed.")

def get_db_connection():
    # Defensive call to ensure table exists
    if not os.path.exists(DB_PATH):
        print(f"DEBUG: Database file {DB_PATH} not found in get_db_connection. Initializing...")
        init_db()
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    # Final check before returning
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT count(*) FROM users")
    except sqlite3.OperationalError:
        print("DEBUG: Table 'users' missing in get_db_connection. Re-initializing...")
        init_db()
        
    return conn
