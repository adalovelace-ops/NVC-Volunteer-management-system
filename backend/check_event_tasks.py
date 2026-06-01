"""Check if events have field officer tasks in the database."""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

# Check events table
cursor.execute("""
    SELECT projects_id as id, title, is_event, internal_tasks 
    FROM projects 
    WHERE is_event = true
    ORDER BY created_at DESC
    LIMIT 5
""")

events = cursor.fetchall()

print(f"\n=== Events in Database ({len(events)} found) ===\n")

for event in events:
    print(f"Event: {event['title']}")
    print(f"  ID: {event['id']}")
    print(f"  Is Event: {event['is_event']}")
    
    # Parse internal_tasks JSON
    tasks = event['internal_tasks']
    if isinstance(tasks, str):
        try:
            tasks = json.loads(tasks)
        except:
            tasks = []
    
    if not tasks:
        print(f"  Internal Tasks: NONE")
    else:
        print(f"  Internal Tasks: {len(tasks)} task(s)")
        for i, task in enumerate(tasks, 1):
            is_field_officer = task.get('isFieldOfficer', False)
            print(f"    {i}. {task.get('title', 'Untitled')}")
            print(f"       - Field Officer: {is_field_officer}")
            print(f"       - Status: {task.get('status', 'Unknown')}")
            print(f"       - Priority: {task.get('priority', 'Unknown')}")
    print()

# Also check programs
cursor.execute("""
    SELECT program_tracks_id as id, title 
    FROM program_tracks 
    ORDER BY created_at DESC
    LIMIT 10
""")

programs = cursor.fetchall()

print(f"\n=== Programs in Database ({len(programs)} found) ===\n")
for prog in programs:
    print(f"  - {prog['title']} (ID: {prog['id']})")

cursor.close()
conn.close()
