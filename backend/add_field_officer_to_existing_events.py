"""
Add field officer task to all existing events that don't have one.
"""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

print("=== Adding Field Officer Task to Existing Events ===\n")

# Get all events
cursor.execute("""
    SELECT projects_id, title, internal_tasks
    FROM projects 
    WHERE is_event = true
    ORDER BY created_at DESC
""")

events = cursor.fetchall()

print(f"Found {len(events)} events in database\n")

updated_count = 0

for event in events:
    event_id = event['projects_id']
    title = event['title']
    internal_tasks = event['internal_tasks']
    
    # Parse internal_tasks
    if isinstance(internal_tasks, str):
        try:
            tasks = json.loads(internal_tasks)
        except:
            tasks = []
    else:
        tasks = internal_tasks or []
    
    # Check if field officer task already exists
    has_field_officer = any(task.get('isFieldOfficer') for task in tasks)
    
    if has_field_officer:
        print(f"✓ {title}")
        print(f"  Already has field officer task, skipping\n")
        continue
    
    print(f"+ {title}")
    print(f"  Adding field officer task...")
    
    # Create field officer task
    now = datetime.utcnow().isoformat()
    field_officer_task = {
        'id': f'task-field-officer-{int(datetime.utcnow().timestamp() * 1000)}',
        'title': 'Field Officer',
        'description': 'Field officer responsible for on-site event coordination and management',
        'category': 'Event Management',
        'priority': 'High',
        'status': 'Unassigned',
        'isFieldOfficer': True,
        'skillsNeeded': ['Event Management', 'Leadership', 'Communication'],
        'createdAt': now,
        'updatedAt': now,
    }
    
    # Add to beginning of tasks array
    updated_tasks = [field_officer_task] + tasks
    
    # Update database
    cursor.execute("""
        UPDATE projects 
        SET internal_tasks = %s
        WHERE projects_id = %s
    """, (json.dumps(updated_tasks), event_id))
    
    updated_count += 1
    print(f"  ✓ Field officer task added\n")

# Commit changes
conn.commit()

print(f"=== Complete ===")
print(f"Updated {updated_count} events with field officer tasks")

# Verify
cursor.execute("""
    SELECT projects_id, title, internal_tasks
    FROM projects 
    WHERE is_event = true
    ORDER BY created_at DESC
""")

events = cursor.fetchall()

print(f"\n=== Verification ===")
for event in events:
    tasks = event['internal_tasks']
    if isinstance(tasks, str):
        try:
            tasks = json.loads(tasks)
        except:
            tasks = []
    
    field_officer_count = sum(1 for t in (tasks or []) if t.get('isFieldOfficer'))
    print(f"{event['title']}: {len(tasks)} tasks, {field_officer_count} field officer")

cursor.close()
conn.close()

print("\n✅ All existing events now have field officer tasks!")
