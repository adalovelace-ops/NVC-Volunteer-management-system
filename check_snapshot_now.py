#!/usr/bin/env python3
"""Check what snapshot returns for the project"""

import os
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_DB_URL", "").strip()

import psycopg
from backend.api import _build_projects_snapshot

conn = psycopg.connect(SUPABASE_URL, connect_timeout=5)

print("=" * 70)
print("SNAPSHOT API RESPONSE")
print("=" * 70)

# Build snapshot with admin role
snapshot = _build_projects_snapshot(
    conn, 
    user_id=None,
    role='admin',
    requested_fields={'projects', 'programTracks'}
)

projects = snapshot.get('projects', [])
program_tracks = snapshot.get('programTracks', [])

print(f"\n[SNAPSHOT] Total projects/programs returned: {len(projects)}")
print(f"[SNAPSHOT] Total programTracks returned: {len(program_tracks)}")

print("\nProjects in snapshot:")
for p in projects:
    loc = p.get('location', {})
    is_event = p.get('isEvent', False)
    parent = p.get('parentProjectId')
    item_type = 'EVENT' if is_event else ('PROJECT' if parent else 'PROGRAM')
    coords = f"({loc.get('latitude')}, {loc.get('longitude')})" if loc else "(no coords)"
    print(f"  [{item_type}] {p.get('id')}: {p.get('title')} {coords}")

print("\nProgramTracks in snapshot:")
for t in program_tracks:
    print(f"  - {t.get('id')}: {t.get('title')}")

print("\n" + "=" * 70)
print("MAP PINS ANALYSIS")
print("=" * 70)

projects_for_map = [p for p in projects if (p.get('parentProjectId') or p.get('isEvent'))]
projects_for_map_with_coords = [p for p in projects_for_map if p.get('location', {}).get('latitude')]

print(f"\nProjects+Events (items that need map pins): {len(projects_for_map)}")
print(f"Projects+Events with valid coordinates: {len(projects_for_map_with_coords)}")
for p in projects_for_map_with_coords:
    loc = p.get('location', {})
    print(f"  - {p.get('id')}: {p.get('title')} at ({loc.get('latitude')}, {loc.get('longitude')})")

conn.close()
