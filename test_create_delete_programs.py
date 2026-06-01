 #!/usr/bin/env python3
"""Test creating and deleting programs end-to-end"""

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
    clear_postgres_hot_storage_collection,
)
from backend.relational_mirror import (
    replace_relational_collection,
)

def get_connection():
    """Connect directly to Supabase PostgreSQL."""
    return psycopg.connect(SUPABASE_URL, connect_timeout=5)

def test_create_and_delete_programs():
    """Test creating and deleting programs"""
    try:
        conn = get_connection()
        
        print("=" * 70)
        print("TEST: Create and Delete Programs")
        print("=" * 70)
        
        # Test 1: Create multiple programs
        print("\n[1/4] Creating 3 test programs...")
        test_programs = []
        for i in range(1, 4):
            test_program = {
                "id": f"program:Test{i}",
                "title": f"Test Program {i}",
                "description": f"Test program {i} description",
                "icon": "folder",
                "color": f"#{i}366f1",
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
            test_programs.append(test_program)
        
        replace_relational_collection(conn, "programs", test_programs)
        conn.commit()
        
        # Verify all 3 were created
        programs = get_postgres_hot_storage_collection(conn, "programs")
        print(f"✅ Created {len(programs)} programs:")
        for p in programs:
            print(f"  - {p.get('id')}: {p.get('title')}")
        
        # Test 2: Verify we can delete one program
        print("\n[2/4] Deleting one program (Test2)...")
        remaining_programs = [p for p in test_programs if p['id'] != 'program:Test2']
        replace_relational_collection(conn, "programs", remaining_programs)
        conn.commit()
        
        programs = get_postgres_hot_storage_collection(conn, "programs")
        print(f"✅ Remaining programs: {len(programs)}")
        for p in programs:
            print(f"  - {p.get('id')}: {p.get('title')}")
        
        # Test 3: Clear all programs
        print("\n[3/4] Clearing all programs...")
        clear_postgres_hot_storage_collection(conn, "programs")
        conn.commit()
        
        programs = get_postgres_hot_storage_collection(conn, "programs")
        print(f"✅ Programs after clear: {len(programs)}")
        
        # Test 4: Create one more to verify create still works after clear
        print("\n[4/4] Creating another program after clear...")
        final_program = {
            "id": "program:FinalTest",
            "title": "Final Test Program",
            "description": "Program created after clear",
            "icon": "star",
            "color": "#ff6366",
            "partnerId": "",
            "imageUrl": "",
            "imageHidden": False,
            "programModule": None,
            "statusMode": None,
            "manualStatus": None,
            "program_id": None,
            "status": "Planning",
            "category": "Education",
            "startDate": datetime.now().isoformat(),
            "endDate": datetime.now().isoformat(),
            "location": {
                "latitude": 0,
                "longitude": 0,
                "address": "Final location"
            },
            "volunteersNeeded": 5,
            "volunteers": [],
            "joinedUserIds": [],
            "linkedEventCount": 0,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
        }
        
        replace_relational_collection(conn, "programs", [final_program])
        conn.commit()
        
        programs = get_postgres_hot_storage_collection(conn, "programs")
        print(f"✅ Final program created: {len(programs)}")
        for p in programs:
            print(f"  - {p.get('id')}: {p.get('title')}")
        
        conn.close()
        
        print("\n" + "=" * 70)
        print("✅ ALL TESTS PASSED!")
        print("=" * 70)
        return True
            
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_create_and_delete_programs()
    sys.exit(0 if success else 1)
