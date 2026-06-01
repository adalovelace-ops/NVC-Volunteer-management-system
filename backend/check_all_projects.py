"""Check all projects and events in database."""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

# Check all projects/events
cursor.execute("""
    SELECT projects_id, title, is_event, internal_tasks, created_at
    FROM projects 
    ORDER BY created_at DESC 
    LIMIT 10
""")

rows = cursor.fetchall()

print(f"\n=== All Projects/Events in Database ({len(rows)}) ===\n")

for row in rows:
    tasks = row['internal_tasks']
    if isinstance(tasks, str):
        try:
            tasks = json.loads(tasks)
        except:
            tasks = []
    
    task_count = len(tasks) if tasks else 0
    field_officer_count = sum(1 for t in (tasks or []) if t.get('isFieldOfficer'))
    
    print(f"{'EVENT' if row['is_event'] else 'PROJECT'}: {row['title']}")
    print(f"  ID: {row['projects_id']}")
    print(f"  Created: {row['created_at']}")
    print(f"  Tasks: {task_count} total, {field_officer_count} field officer")
    if tasks:
        for task in tasks:
            fo_marker = " [FIELD OFFICER]" if task.get('isFieldOfficer') else ""
            print(f"    - {task.get('title', 'Untitled')}{fo_marker}")
    print()

cursor.close()
conn.close()
