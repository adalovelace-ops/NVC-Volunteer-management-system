#!/usr/bin/env python3
"""Test creating a program to verify the fix works"""

import os
import sys
from datetime import datetime
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
)
from backend.relational_mirror import (
    replace_relational_collection,
)

def get_connection():
    """Connect directly to Supabase PostgreSQL."""
    return psycopg.connect(SUPABASE_URL, connect_timeout=5)

def test_create_program():
    """Test creating a program"""
    try:
        conn = get_connection()
        
        # Create a test program
        test_program = {
            "id": "program:TestProgram",
            "title": "Test Program",
            "description": "This is a test program to verify the fix",
            "icon": "folder",
            "color": "#6366f1",
            "partnerId": "",
            "imageUrl": "",
            "imageHidden": False,
            "programModule": None,
            "statusMode": None,
            "manualStatus": None,
            "program_id": None,
            "status": "Planning",
            "category": "Nutrition",
            "startDate": datetime.now().isoformat(),
            "endDate": datetime.now().isoformat(),
            "location": {
                "latitude": 0,
                "longitude": 0,
                "address": "Test location"
            },
            "volunteersNeeded": 0,
            "volunteers": [],
            "joinedUserIds": [],
            "linkedEventCount": 0,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
        }
        
        print("Creating test program...")
        print(f"Program data: {test_program}")
        
        # Try to save it
        replace_relational_collection(conn, "programs", [test_program])
        conn.commit()
        
        # Verify it was saved
        programs = get_postgres_hot_storage_collection(conn, "programs")
        print(f"\n✅ Programs in database: {len(programs)}")
        for p in programs:
            print(f"  - {p.get('id')}: {p.get('title')}")
        
        conn.close()
        return True
            
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_create_program()
    sys.exit(0 if success else 1)
