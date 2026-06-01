#!/usr/bin/env python3
"""Debug snapshot processing step by step"""

import os
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_DB_URL", "").strip()

import psycopg
from backend.app_storage_seed import get_postgres_hot_storage_collection

conn = psycopg.connect(SUPABASE_URL, connect_timeout=5)

print("=" * 70)
print("DEBUG: RAW DATABASE FETCH")
print("=" * 70)

# Direct fetch without caching
raw_projects = get_postgres_hot_storage_collection(conn, "projects")
raw_events = get_postgres_hot_storage_collection(conn, "events")
raw_programs_table = get_postgres_hot_storage_collection(conn, "programs")

print(f"\nraw_projects ({len(raw_projects)}):")
for p in raw_projects:
    print(f"  - {p.get('id')}: {p.get('title')}")
    print(f"    isEvent: {p.get('isEvent')}")
    print(f"    parentProjectId: {p.get('parentProjectId')}")

print(f"\nraw_events ({len(raw_events)}):")
for e in raw_events:
    print(f"  - {e.get('id')}: {e.get('title')}")

print(f"\nraw_programs_table ({len(raw_programs_table)}):")
for p in raw_programs_table:
    print(f"  - {p.get('id')}: {p.get('title')}")
    print(f"    isEvent: {p.get('isEvent')}")
    print(f"    parentProjectId: {p.get('parentProjectId')}")

print("\n" + "=" * 70)
print("DEBUG: SNAPSHOT FILTERING")
print("=" * 70)

# Replicate the snapshot logic
programs_from_projects_table = [project for project in raw_projects if not bool(project.get("isEvent"))]
programs_from_programs_table = [p for p in raw_programs_table if not bool(p.get("isEvent")) and not p.get("parentProjectId")]
snapshot_projects = [*programs_from_projects_table, *programs_from_programs_table, *raw_events]

print(f"\nprograms_from_projects_table ({len(programs_from_projects_table)}):")
for p in programs_from_projects_table:
    print(f"  - {p.get('id')}: {p.get('title')}")

print(f"\nprograms_from_programs_table ({len(programs_from_programs_table)}):")
for p in programs_from_programs_table:
    print(f"  - {p.get('id')}: {p.get('title')}")

print(f"\nFinal snapshot_projects ({len(snapshot_projects)}):")
for p in snapshot_projects:
    print(f"  - {p.get('id')}: {p.get('title')}")

conn.close()
