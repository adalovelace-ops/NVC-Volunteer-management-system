#!/usr/bin/env python3
"""Test the projects snapshot API to verify programs are included"""

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

from backend.api import _build_projects_snapshot

def get_connection():
    """Connect directly to Supabase PostgreSQL."""
    return psycopg.connect(SUPABASE_URL, connect_timeout=5)

def test_snapshot():
    """Test the snapshot API"""
    try:
        conn = get_connection()
        
        print("=" * 70)
        print("TEST: Projects Snapshot API")
        print("=" * 70)
        
        # Build snapshot with admin role requesting projects and programTracks
        snapshot = _build_projects_snapshot(
            conn, 
            user_id=None,
            role='admin',
            requested_fields={'projects', 'programTracks'}
        )
        
        projects = snapshot.get('projects', [])
        program_tracks = snapshot.get('programTracks', [])
        
        print(f"\n[SNAPSHOT] Total projects returned: {len(projects)}")
        print(f"[SNAPSHOT] Total programTracks returned: {len(program_tracks)}")
        
        # Count programs vs events in projects
        programs_in_projects = [p for p in projects if not p.get('isEvent')]
        events_in_projects = [p for p in projects if p.get('isEvent')]
        
        print(f"\n[PROJECTS] Non-event projects: {len(programs_in_projects)}")
        print(f"[PROJECTS] Events: {len(events_in_projects)}")
        
        if programs_in_projects:
            print("\n[PROJECTS] Sample programs:")
            for p in programs_in_projects[:5]:
                print(f"  - {p.get('id')}: {p.get('title')} (location: {bool(p.get('location'))})")
        
        if program_tracks:
            print("\n[TRACKS] Sample program tracks:")
            for t in program_tracks[:5]:
                print(f"  - {t.get('id')}: {t.get('title')}")
        
        print("\n" + "=" * 70)
        print("✅ Snapshot test completed")
        print("=" * 70)
        
        conn.close()
        
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_snapshot()
