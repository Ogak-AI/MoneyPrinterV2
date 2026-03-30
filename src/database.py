import os
from config import ROOT_DIR

DATABASE_URL = os.environ.get("DATABASE_URL")

# ── Postgres (production on Render + Supabase) ────────────────────────────────
if DATABASE_URL:
    import psycopg2
    import psycopg2.extras

    def init_db():
        print("INFO: Using Postgres database (Supabase).")
        conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                is_verified INTEGER DEFAULT 0,
                verification_token TEXT,
                verification_otp TEXT,
                reset_token TEXT,
                reset_token_expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Add missing columns idempotently
        extra_cols = [
            ("is_verified", "INTEGER DEFAULT 0"),
            ("verification_token", "TEXT"),
            ("verification_otp", "TEXT"),
            ("reset_token", "TEXT"),
            ("reset_token_expires_at", "TIMESTAMP"),
        ]
        for col_name, col_type in extra_cols:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type}")
            except Exception:
                pass
        conn.commit()
        conn.close()
        print("INFO: Postgres database initialised.")

    def get_db_connection():
        conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        conn.cursor_factory = psycopg2.extras.RealDictCursor
        return conn

# ── SQLite (local development fallback) ──────────────────────────────────────
else:
    import sqlite3

    DB_PATH = os.path.abspath(os.path.join(ROOT_DIR, ".mp", "users.db"))

    def init_db():
        print(f"INFO: Using SQLite database at {DB_PATH} (local dev).")
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                is_verified INTEGER DEFAULT 0,
                verification_token TEXT,
                verification_otp TEXT,
                reset_token TEXT,
                reset_token_expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        extra_cols = [
            ("is_verified", "INTEGER DEFAULT 0"),
            ("verification_token", "TEXT"),
            ("verification_otp", "TEXT"),
            ("reset_token", "TEXT"),
            ("reset_token_expires_at", "TIMESTAMP"),
        ]
        for col_name, col_type in extra_cols:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            except sqlite3.OperationalError:
                pass
        conn.commit()
        conn.close()

    def get_db_connection():
        if not os.path.exists(DB_PATH):
            init_db()
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
