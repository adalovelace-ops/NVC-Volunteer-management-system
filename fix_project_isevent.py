#!/usr/bin/env python3
"""Fix the project - change isEvent from True to False"""

import os
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_DB_URL")

import psycopg
from backend.app_storage_seed import get_postgres_hot_storage_collection
from backend.api import _postgres_upsert_hot_item

conn = psycopg.connect(SUPABASE_URL)

print("=" * 70)
print("FIX: Correct project isEvent flag")
print("=" * 70)

# Get the project
projects = get_postgres_hot_storage_collection(conn, 'projects')
print(f"\nProjects before fix: {len(projects)}")
for p in projects:
    print(f"  - {p.get('id')}: isEvent={p.get('isEvent')}")

# Fix the project - set isEvent to False
if projects:
    project = projects[0]
    project['isEvent'] = False
    _postgres_upsert_hot_item(conn, "projects", project)
    conn.commit()
    print(f"\n✅ Fixed: {project.get('id')} - set isEvent=False")

# Verify fix
projects = get_postgres_hot_storage_collection(conn, 'projects')
print(f"\nProjects after fix: {len(projects)}")
for p in projects:
    print(f"  - {p.get('id')}: isEvent={p.get('isEvent')}")

conn.close()

print("\n" + "=" * 70)
print("✅ Project fixed!")
print("   The project will now show in the UI and appear as a map pin")
print("=" * 70)
