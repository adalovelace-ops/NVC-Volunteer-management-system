"""
Verify that the project meets the criteria to appear on the map
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

# Get all projects
cursor.execute("""
    SELECT projects_id, title, parent_project_id, is_event, location
    FROM projects 
    ORDER BY created_at ASC
""")

all_projects = cursor.fetchall()

print("=== All Projects in Database ===\n")
for p in all_projects:
    location = p.get('location', {})
    if isinstance(location, str):
        location = json.loads(location)
    
    print(f"Title: {p['title']}")
    print(f"ID: {p['projects_id']}")
    print(f"parent_project_id: {p['parent_project_id']}")
    print(f"is_event: {p['is_event']}")
    print(f"Location: {location.get('address')}")
    print(f"Coordinates: lat={location.get('latitude')}, lng={location.get('longitude')}")
    print()

# Apply the getMappedProjects filter logic
print("=== Applying getMappedProjects Filter ===\n")

mapped_projects = []
for p in all_projects:
    # Filter logic from projectMap.ts
    if p['parent_project_id']:
        print(f"✅ INCLUDED: {p['title']} (has parent_project_id)")
        mapped_projects.append(p)
    elif p['is_event']:
        print(f"✅ INCLUDED: {p['title']} (is_event=true)")
        mapped_projects.append(p)
    else:
        print(f"❌ EXCLUDED: {p['title']} (no parent, not an event - treated as PROGRAM)")

print(f"\n=== Result ===")
print(f"Total projects in DB: {len(all_projects)}")
print(f"Projects that will appear on map: {len(mapped_projects)}")

if mapped_projects:
    print("\nProjects on the map:")
    for p in mapped_projects:
        location = p.get('location', {})
        if isinstance(location, str):
            location = json.loads(location)
        print(f"  📍 {p['title']} at ({location.get('latitude')}, {location.get('longitude')})")
else:
    print("\n⚠️ No projects will appear on the map!")

cursor.close()
conn.close()
