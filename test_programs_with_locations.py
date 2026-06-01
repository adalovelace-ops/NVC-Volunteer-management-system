#!/usr/bin/env python3
"""Create test programs with valid map coordinates"""

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

from backend.app_storage_seed import get_postgres_hot_storage_collection

def get_connection():
    """Connect directly to Supabase PostgreSQL."""
    return psycopg.connect(SUPABASE_URL, connect_timeout=5)

def test_programs_with_locations():
    """Create test projects and events with valid locations"""
    try:
        conn = get_connection()
        
        print("=" * 70)
        print("TEST: Create Projects and Events with Map Locations")
        print("=" * 70)
        
        # First, create programs
        now = datetime.utcnow().isoformat()
        programs = [
            {
                "id": "program:Education",
                "title": "Education Program",
                "description": "Main education program",
                "category": "Education",
                "icon": "school",
                "color": "#2563eb",
                "location": {
                    "latitude": 0,
                    "longitude": 0,
                    "address": "Program location to be finalized"
                },
                "status": "In Progress",
                "partnerId": "",
                "volunteersNeeded": 50,
                "volunteers": [],
                "joinedUserIds": [],
                "linkedEventCount": 3,
                "createdAt": now,
                "updatedAt": now,
            },
            {
                "id": "program:Livelihood",
                "title": "Livelihood Program",
                "description": "Main livelihood program",
                "category": "Livelihood",
                "icon": "work",
                "color": "#b45309",
                "location": {
                    "latitude": 0,
                    "longitude": 0,
                    "address": "Program location to be finalized"
                },
                "status": "In Progress",
                "partnerId": "",
                "volunteersNeeded": 40,
                "volunteers": [],
                "joinedUserIds": [],
                "linkedEventCount": 2,
                "createdAt": now,
                "updatedAt": now,
            },
        ]
        
        # Create programs first
        from backend.api import _postgres_upsert_hot_item
        for program in programs:
            _postgres_upsert_hot_item(conn, "programs", program)
            print(f"✅ Created program: {program['id']}: {program['title']}")
        
        # Now create projects and events UNDER those programs with map locations
        projects_and_events = [
            {
                "id": "project:Education-Bacolod",
                "parentProjectId": "program:Education",
                "title": "Education Outreach - Bacolod",
                "description": "Education project in Bacolod City",
                "category": "Education",
                "isEvent": False,
                "location": {
                    "latitude": 10.404,
                    "longitude": 123.632,
                    "address": "Bacolod City, Negros Occidental, Philippines"
                },
                "status": "In Progress",
                "partnerId": "",
                "volunteersNeeded": 15,
                "volunteers": [],
                "joinedUserIds": [],
                "createdAt": now,
                "updatedAt": now,
            },
            {
                "id": "project:Education-Silay",
                "parentProjectId": "program:Education",
                "title": "Education Outreach - Silay",
                "description": "Education project in Silay City",
                "category": "Education",
                "isEvent": False,
                "location": {
                    "latitude": 10.760,
                    "longitude": 123.739,
                    "address": "Silay City, Negros Occidental, Philippines"
                },
                "status": "In Progress",
                "partnerId": "",
                "volunteersNeeded": 12,
                "volunteers": [],
                "joinedUserIds": [],
                "createdAt": now,
                "updatedAt": now,
            },
            {
                "id": "event:Livelihood-Workshop-Cadiz",
                "parentProjectId": "program:Livelihood",
                "title": "Livelihood Workshop - Cadiz",
                "description": "Livelihood training event in Cadiz",
                "category": "Livelihood",
                "isEvent": True,
                "location": {
                    "latitude": 10.277,
                    "longitude": 123.429,
                    "address": "Cadiz City, Negros Occidental, Philippines"
                },
                "status": "In Progress",
                "partnerId": "",
                "volunteersNeeded": 20,
                "volunteers": [],
                "joinedUserIds": [],
                "startDate": now,
                "endDate": now,
                "createdAt": now,
                "updatedAt": now,
            },
        ]
        
        # Create projects and events
        for item in projects_and_events:
            if item.get("isEvent"):
                _postgres_upsert_hot_item(conn, "events", item)
                print(f"✅ Created event: {item['id']}: {item['title']}")
            else:
                _postgres_upsert_hot_item(conn, "projects", item)
                print(f"✅ Created project: {item['id']}: {item['title']}")
        
        # Verify they're saved
        from backend.app_storage_seed import get_postgres_hot_storage_collection
        all_programs = get_postgres_hot_storage_collection(conn, "programs")
        all_projects = get_postgres_hot_storage_collection(conn, "projects")
        all_events = get_postgres_hot_storage_collection(conn, "events")
        
        print(f"\n[DATABASE] Total programs: {len(all_programs)}")
        print(f"[DATABASE] Total projects: {len(all_projects)}")
        print(f"[DATABASE] Total events: {len(all_events)}")
        
        print("\nPrograms in database:")
        for p in all_programs:
            loc = p.get("location", {})
            coords = f"({loc.get('latitude')}, {loc.get('longitude')})" if loc else "(no coords)"
            print(f"  - {p.get('id')}: {p.get('title')} {coords}")
        
        print("\nProjects with map pins in database:")
        for p in all_projects:
            loc = p.get("location", {})
            coords = f"({loc.get('latitude')}, {loc.get('longitude')})" if loc else "(no coords)"
            print(f"  - {p.get('id')}: {p.get('title')} {coords}")
        
        print("\nEvents with map pins in database:")
        for e in all_events:
            loc = e.get("location", {})
            coords = f"({loc.get('latitude')}, {loc.get('longitude')})" if loc else "(no coords)"
            print(f"  - {e.get('id')}: {e.get('title')} {coords}")
        
        conn.close()
        
        print("\n" + "=" * 70)
        print("✅ Programs, Projects, and Events created successfully")
        print("   - Programs will show in the UI but NOT on the map")
        print("   - Projects and Events will show map pins")
        print("=" * 70)
        
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_programs_with_locations()
