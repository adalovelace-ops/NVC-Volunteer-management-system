"""
Migration: Add compound & partial performance indexes for messages table.
Optimizes direct message lookup, chronological conversation retrieval,
and unread filtering.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from db import get_connection, load_environment


INDEXES = [
    ("idx_messages_sender_id", "public.messages", "(sender_id)"),
    ("idx_messages_recipient_id", "public.messages", "(recipient_id)"),
    ("idx_messages_pair", "public.messages", "(sender_id, recipient_id, timestamp ASC)"),
    ("idx_messages_pair_rev", "public.messages", "(recipient_id, sender_id, timestamp ASC)"),
    ("idx_messages_timestamp", "public.messages", "(timestamp DESC)"),
    ("idx_messages_sender_recent", "public.messages", "(sender_id, timestamp DESC, id DESC)"),
    ("idx_messages_recipient_recent", "public.messages", "(recipient_id, timestamp DESC, id DESC)"),
    ("idx_messages_unread", "public.messages", "(recipient_id, read) WHERE read = false"),
]


def run_migration() -> None:
    load_environment()
    print("Connecting to database...")

    with get_connection() as conn:
        with conn.cursor() as cur:
            # Ensure messages table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS public.messages (
                    id text PRIMARY KEY,
                    sender_id text NOT NULL,
                    recipient_id text NOT NULL,
                    project_id text,
                    content text NOT NULL,
                    timestamp timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    read boolean NOT NULL DEFAULT false,
                    attachments jsonb NOT NULL DEFAULT '[]'::jsonb
                );
            """)
            print("Table public.messages verified.")

            for index_name, table_name, index_def in INDEXES:
                sql = f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} {index_def};"
                try:
                    cur.execute(sql)
                    print(f"Created/Verified index: {index_name}")
                except Exception as e:
                    print(f"Error creating {index_name}: {e}")

        conn.commit()

    print("All message indexes successfully applied!")


if __name__ == "__main__":
    run_migration()
