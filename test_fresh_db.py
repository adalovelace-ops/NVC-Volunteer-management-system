#!/usr/bin/env python3
"""Fresh test - bypass caches"""

import os
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_DB_URL')

import psycopg
from backend.app_storage_seed import get_postgres_hot_storage_collection

conn = psycopg.connect(SUPABASE_URL)

print("=" * 70)
print("FRESH DATABASE READ - NO CACHES")
print("=" * 70)

# Read directly without any caching
programs = get_postgres_hot_storage_collection(conn, 'programs')
projects = get_postgres_hot_storage_collection(conn, 'projects')
events = get_postgres_hot_storage_collection(conn, 'events')

print(f"\nPrograms: {len(programs)}")
for p in programs:
    print(f"  - {p.get('id')}: {p.get('title')}")

print(f"\nProjects: {len(projects)}")
for p in projects:
    loc = p.get('location', {})
    print(f"  - {p.get('id')}: {p.get('title')}")
    print(f"    Coords: {loc.get('latitude')}, {loc.get('longitude')}")

print(f"\nEvents: {len(events)}")
for e in events:
    loc = e.get('location', {})
    print(f"  - {e.get('id')}: {e.get('title')} (parent: {e.get('parentProjectId')})")
    print(f"    Coords: {loc.get('latitude')}, {loc.get('longitude')}")

print(f"\nTotal items that should show on map (projects + events with coords):")
map_items = projects + events
map_items_with_coords = [item for item in map_items if item.get('location', {}).get('latitude')]
print(f"  {len(map_items_with_coords)} items")
for item in map_items_with_coords:
    loc = item.get('location', {})
    item_type = 'EVENT' if item.get('isEvent') else 'PROJECT'
    print(f"    - {item_type}: {item.get('id')} at ({loc.get('latitude')}, {loc.get('longitude')})")

conn.close()
