"""
Create a test project under the Nutrition program so it appears on the map.

Current situation:
- "Nutrition Test Project" is a PROGRAM (no parent, not an event)
- Programs don't appear on the map
- We need to create actual PROJECTS under this program

This script will create a sample project under the Nutrition program.
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import json

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

# Get the Nutrition program
cursor.execute("""
    SELECT projects_id, title
    FROM projects 
    WHERE projects_id = 'project-1780244100039'
""")

program = cursor.fetchone()
if not program:
    print("❌ Nutrition program not found!")
    exit(1)

print(f"Found program: {program['title']} (ID: {program['projects_id']})")

# Create a sample project under this program
print("\nCreating sample project under the Nutrition program...")

project_data = {
    'projects_id': f'project-{int(__import__("time").time() * 1000)}',
    'title': 'Mingo Feeding Program - Bacolod',
    'description': 'Nutritious meal distribution for undernourished children in Bacolod City schools. Support for undernourished children in public schools. Daily nutritious meals for 100 children over 3 months.',
    'category': 'Nutrition',
    'program_module': 'Nutrition',
    'program_id': 'Nutrition',
    'status': 'In Progress',
    'is_event': False,
    'image_hidden': False,
    'volunteers': [],
    'joined_user_ids': [],
    'internal_tasks': [],
    'skills_needed': [],
    'parent_project_id': program['projects_id'],
    'location': json.dumps({
        'address': 'Bacolod City, Negros Island Region (NIR)',
        'latitude': 10.6765,
        'longitude': 122.9509
    }),
    'volunteers_needed': 5
}

cursor.execute("""
    INSERT INTO projects (
        projects_id, title, description, category, program_module, program_id,
        status, is_event, image_hidden, volunteers, joined_user_ids, internal_tasks, skills_needed, parent_project_id, location, volunteers_needed,
        created_at, updated_at
    ) VALUES (
        %(projects_id)s, %(title)s, %(description)s, %(category)s, %(program_module)s, %(program_id)s,
        %(status)s, %(is_event)s, %(image_hidden)s, %(volunteers)s, %(joined_user_ids)s, %(internal_tasks)s, %(skills_needed)s, %(parent_project_id)s, %(location)s::jsonb, %(volunteers_needed)s,
        now(), now()
    )
    RETURNING projects_id, title
""", project_data)

new_project = cursor.fetchone()
conn.commit()

print(f"✅ Created project: {new_project['title']}")
print(f"   ID: {new_project['projects_id']}")
print(f"   Parent: {program['title']}")

# Create another project for variety
print("\nCreating second sample project...")

project_data2 = {
    'projects_id': f'project-{int(__import__("time").time() * 1000) + 1}',
    'title': 'Farm to Fork - Kabankalan',
    'description': 'Local farmers supply fresh produce for nutrition programs. Connect local farmers with nutrition programs. Sustainable supply chain for fresh produce.',
    'category': 'Nutrition',
    'program_module': 'Nutrition',
    'program_id': 'Nutrition',
    'status': 'Planning',
    'is_event': False,
    'image_hidden': False,
    'volunteers': [],
    'joined_user_ids': [],
    'internal_tasks': [],
    'skills_needed': [],
    'parent_project_id': program['projects_id'],
    'location': json.dumps({
        'address': 'Kabankalan City, Negros Island Region (NIR)',
        'latitude': 10.6711,
        'longitude': 122.9534
    }),
    'volunteers_needed': 3
}

cursor.execute("""
    INSERT INTO projects (
        projects_id, title, description, category, program_module, program_id,
        status, is_event, image_hidden, volunteers, joined_user_ids, internal_tasks, skills_needed, parent_project_id, location, volunteers_needed,
        created_at, updated_at
    ) VALUES (
        %(projects_id)s, %(title)s, %(description)s, %(category)s, %(program_module)s, %(program_id)s,
        %(status)s, %(is_event)s, %(image_hidden)s, %(volunteers)s, %(joined_user_ids)s, %(internal_tasks)s, %(skills_needed)s, %(parent_project_id)s, %(location)s::jsonb, %(volunteers_needed)s,
        now(), now()
    )
    RETURNING projects_id, title
""", project_data2)

new_project2 = cursor.fetchone()
conn.commit()

print(f"✅ Created project: {new_project2['title']}")
print(f"   ID: {new_project2['projects_id']}")

# Verify the hierarchy
cursor.execute("""
    SELECT projects_id, title, parent_project_id, is_event, location
    FROM projects 
    WHERE parent_project_id = %s OR projects_id = %s
    ORDER BY 
        CASE WHEN parent_project_id IS NULL THEN 0 ELSE 1 END,
        created_at DESC
""", (program['projects_id'], program['projects_id']))

hierarchy = cursor.fetchall()
print(f"\n=== Current Hierarchy ===")
for item in hierarchy:
    if item['projects_id'] == program['projects_id']:
        print(f"\n📁 PROGRAM: {item['title']}")
    elif item['is_event']:
        location = item.get('location', {})
        if isinstance(location, str):
            location = json.loads(location)
        print(f"  📅 EVENT: {item['title']}")
        print(f"     Location: {location.get('address', 'N/A')}")
    else:
        location = item.get('location', {})
        if isinstance(location, str):
            location = json.loads(location)
        print(f"  📋 PROJECT: {item['title']}")
        print(f"     Location: {location.get('address', 'N/A')}")
        print(f"     Coordinates: ({location.get('latitude')}, {location.get('longitude')})")

cursor.close()
conn.close()

print("\n✅ Done! Your projects should now appear on the Impact Explorer map.")
print("   Refresh your app to see the changes.")
