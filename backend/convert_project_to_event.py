"""
Convert the existing project to an event and add field officer task.
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

print("=== Converting Project to Event ===\n")

# Get the project
cursor.execute("""
    SELECT projects_id, title, is_event, internal_tasks
    FROM projects 
    WHERE projects_id = 'project-1780217407655'
""")

project = cursor.fetchone()

if not project:
    print("❌ Project not found!")
    cursor.close()
    conn.close()
    exit(1)

print(f"Found: {project['title']}")
print(f"Current type: {'EVENT' if project['is_event'] else 'PROJECT'}")
print(f"Current tasks: {len(project['internal_tasks']) if project['internal_tasks'] else 0}")

# Ask user what to do
print("\nOptions:")
print("1. Convert to EVENT (change is_event to true)")
print("2. Add field officer task to PROJECT (keep as project)")
print("3. Cancel")

choice = input("\nEnter choice (1, 2, or 3): ").strip()

if choice == '3':
    print("Cancelled")
    cursor.close()
    conn.close()
    exit(0)

# Parse internal_tasks
internal_tasks = project['internal_tasks']
if isinstance(internal_tasks, str):
    try:
        tasks = json.loads(internal_tasks)
    except:
        tasks = []
else:
    tasks = internal_tasks or []

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

if choice == '1':
    # Convert to event
    print("\nConverting to EVENT and adding field officer task...")
    cursor.execute("""
        UPDATE projects 
        SET is_event = true,
            internal_tasks = %s
        WHERE projects_id = 'project-1780217407655'
    """, (json.dumps(updated_tasks),))
    print("✓ Converted to EVENT")
    
elif choice == '2':
    # Just add task
    print("\nAdding field officer task to PROJECT...")
    cursor.execute("""
        UPDATE projects 
        SET internal_tasks = %s
        WHERE projects_id = 'project-1780217407655'
    """, (json.dumps(updated_tasks),))
    print("✓ Added field officer task")

# Commit
conn.commit()

# Verify
cursor.execute("""
    SELECT projects_id, title, is_event, internal_tasks
    FROM projects 
    WHERE projects_id = 'project-1780217407655'
""")

updated = cursor.fetchone()

print(f"\n=== Result ===")
print(f"Title: {updated['title']}")
print(f"Type: {'EVENT' if updated['is_event'] else 'PROJECT'}")

tasks = updated['internal_tasks']
if isinstance(tasks, str):
    try:
        tasks = json.loads(tasks)
    except:
        tasks = []

print(f"Tasks: {len(tasks)}")
for task in tasks:
    fo_marker = " [FIELD OFFICER]" if task.get('isFieldOfficer') else ""
    print(f"  - {task.get('title')}{fo_marker}")

cursor.close()
conn.close()

print("\n✅ Done! Refresh your browser to see the changes.")
