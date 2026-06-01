#!/usr/bin/env python3
"""Delete all programs from the database"""

import os
import sys
from dotenv import load_dotenv

# Load environment
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_DB_URL", "").strip()

if not SUPABASE_URL:
    print("ERROR: SUPABASE_DB_URL not found in environment")
    sys.exit(1)

try:
    import psycopg
except ImportError:
    print("ERROR: psycopg not installed. Install with: pip install psycopg[binary]")
    sys.exit(1)

from backend.app_storage_seed import (
    get_postgres_hot_storage_collection,
    clear_postgres_hot_storage_collection,
)

def get_connection():
    """Connect directly to Supabase PostgreSQL."""
    return psycopg.connect(SUPABASE_URL, connect_timeout=5)

def delete_all_programs():
    """Delete all programs from the database"""
    try:
        conn = get_connection()
        
        # Get all programs
        programs = get_postgres_hot_storage_collection(conn, "programs")
        print(f"Found {len(programs)} programs:")
        for p in programs:
            print(f"  - {p.get('id')}: {p.get('title')}")
        
        # Delete all programs
        clear_postgres_hot_storage_collection(conn, "programs")
        conn.commit()
        conn.close()
        print(f"\n✅ Deleted all {len(programs)} programs!")
            
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    delete_all_programs()
