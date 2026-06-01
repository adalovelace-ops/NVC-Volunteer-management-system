"""
Create the actual "Nutrition Test Project" as a PROJECT under the "Nutrition Test Program" PROGRAM
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import json
import time

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

# The existing item is the PROGRAM
program_id = 'project-1780244100039'

# Create the actual PROJECT under this program
project_id = f'project-{int(time.time() * 1000)}'

cursor.execute("""
    INSERT INTO projects (
        projects_id, title, description, category, program_module, program_id,
        status, is_event, image_hidden, volunteers, joined_user_ids, internal_tasks, skills_needed,
        parent_project_id, location, volunteers_needed,
        start_date, end_date,
        created_at, updated_at
    ) VALUES (
        %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s, %s, %s,
        %s, %s::jsonb, %s,
        %s, %s,
        now(), now()
    )
    RETURNING projects_id, title
""", (
    project_id,
    'Nutrition Test Project',
    'Testing nutrition project functionality with proper location mapping',
    'Nutrition',
    'Nutrition',
    'Nutrition',
    'In Progress',
    False,  # is_event
    False,  # image_hidden
    [],  # volunteers
    [],  # joined_user_ids
    [],  # internal_tasks
    [],  # skills_needed
    program_id,  # parent_project_id - THIS IS THE KEY!
    json.dumps({
        'address': 'Binalbagan, Negros Island Region (NIR)',
        'latitude': 10.68,
        'longitude': 122.97
    }),
    20,  # volunteers_needed
    '2026-06-01T00:06:00Z',  # start_date
    '2026-06-08T00:06:00Z'   # end_date
))

new_project = cursor.fetchone()
conn.commit()

print(f"✅ Created PROJECT: {new_project['title']}")
print(f"   ID: {new_project['projects_id']}")
print(f"   Parent PROGRAM ID: {program_id}")

# Verify the hierarchy
cursor.execute("""
    SELECT projects_id, title, parent_project_id, is_event, location
    FROM projects 
    ORDER BY 
        CASE WHEN parent_project_id IS NULL THEN 0 ELSE 1 END,
        created_at ASC
""")

all_items = cursor.fetchall()
print(f"\n=== Complete Hierarchy ===")
for item in all_items:
    if item['parent_project_id'] is None:
        print(f"\n📁 PROGRAM: {item['title']}")
        print(f"   ID: {item['projects_id']}")
    else:
        location = item.get('location', {})
        if isinstance(location, str):
            location = json.loads(location)
        print(f"  📋 PROJECT: {item['title']}")
        print(f"     ID: {item['projects_id']}")
        print(f"     Location: {location.get('address')}")
        print(f"     Coordinates: ({location.get('latitude')}, {location.get('longitude')})")

cursor.close()
conn.close()

print("\n✅ Done! Your project should now appear on the Impact Explorer map.")
print("   The project has a parent_project_id, so it will be included in getMappedProjects().")
