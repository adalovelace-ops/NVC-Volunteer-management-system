#!/usr/bin/env python3
"""Check existing database records and create event"""

import os
from dotenv import load_dotenv
import psycopg

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_DB_URL')
conn = psycopg.connect(SUPABASE_URL)

from backend.app_storage_seed import get_postgres_hot_storage_collection
from backend.api import _postgres_upsert_hot_item
from datetime import datetime

# Get existing records
programs = get_postgres_hot_storage_collection(conn, 'programs')
projects = get_postgres_hot_storage_collection(conn, 'projects')
events = get_postgres_hot_storage_collection(conn, 'events')

print("=" * 70)
print("EXISTING DATABASE STATE")
print("=" * 70)

print(f"\nPrograms ({len(programs)}):")
for p in programs:
    print(f"  - {p.get('id')}: {p.get('title')}")
    program_id = p.get('id')
    program_title = p.get('title')

print(f"\nProjects ({len(projects)}):")
for p in projects:
    print(f"  - {p.get('id')}: {p.get('title')} (parent: {p.get('parentProjectId')})")
    project_id = p.get('id')
    project_title = p.get('title')

print(f"\nEvents ({len(events)}):")
for e in events:
    print(f"  - {e.get('id')}: {e.get('title')}")

print("\n" + "=" * 70)
print("CREATING EVENT")
print("=" * 70)

# Create an event under the existing project
now = datetime.utcnow().isoformat()
event = {
    "id": f"event:{project_id}-ActivityDay",
    "parentProjectId": project_id,
    "title": f"{project_title} - Activity Day",
    "description": "Volunteer activity day for the project",
    "category": projects[0].get('category', 'Education') if projects else 'Education',
    "isEvent": True,
    "location": {
        "latitude": 10.404,
        "longitude": 123.632,
        "address": "Bacolod City, Negros Occidental, Philippines"
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
}

_postgres_upsert_hot_item(conn, "events", event)
print(f"\n✅ Created event: {event['id']}")
print(f"   Title: {event['title']}")
print(f"   Parent Project: {event['parentProjectId']}")
print(f"   Location: {event['location']}")

# Verify it was created
events = get_postgres_hot_storage_collection(conn, 'events')
print(f"\nEvents now: {len(events)}")
for e in events:
    print(f"  - {e.get('id')}: {e.get('title')} (parent: {e.get('parentProjectId')})")

conn.close()

print("\n" + "=" * 70)
print("✅ Event created with map coordinates!")
print("   The event will now show a map pin")
print("=" * 70)
