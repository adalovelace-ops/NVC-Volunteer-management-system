"""
Fix the Nutrition Test Project:
1. Delete the PROGRAM (parent) since we only need the PROJECT
2. Update the PROJECT to have no parent (make it standalone but mappable)
3. Set is_event=true so it appears on the map
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

# Get both entries
cursor.execute("""
    SELECT projects_id, title, description, parent_project_id, is_event, location
    FROM projects 
    WHERE title = 'Nutrition Test Project'
    ORDER BY created_at ASC
""")

entries = cursor.fetchall()
print(f"Found {len(entries)} entries with title 'Nutrition Test Project':\n")

program_entry = None
project_entry = None

for entry in entries:
    print(f"ID: {entry['projects_id']}")
    print(f"Description: {entry['description']}")
    print(f"parent_project_id: {entry['parent_project_id']}")
    print(f"is_event: {entry['is_event']}")
    print()
    
    if entry['parent_project_id'] is None:
        program_entry = entry
    else:
        project_entry = entry

# Strategy: Keep the PROJECT entry, delete the PROGRAM entry, and make the PROJECT an event
if program_entry and project_entry:
    print(f"Deleting PROGRAM entry: {program_entry['projects_id']}")
    cursor.execute("DELETE FROM projects WHERE projects_id = %s", (program_entry['projects_id'],))
    
    print(f"Updating PROJECT entry: {project_entry['projects_id']}")
    print("  - Setting parent_project_id = NULL")
    print("  - Setting is_event = TRUE (so it appears on map)")
    
    cursor.execute("""
        UPDATE projects 
        SET parent_project_id = NULL, 
            is_event = TRUE,
            updated_at = now()
        WHERE projects_id = %s
        RETURNING projects_id, title, is_event, parent_project_id, location
    """, (project_entry['projects_id'],))
    
    updated = cursor.fetchone()
    conn.commit()
    
    location = updated['location']
    if isinstance(location, str):
        location = json.loads(location)
    
    print(f"\n✅ Fixed! Now you have:")
    print(f"   Title: {updated['title']}")
    print(f"   ID: {updated['projects_id']}")
    print(f"   is_event: {updated['is_event']}")
    print(f"   parent_project_id: {updated['parent_project_id']}")
    print(f"   Location: {location.get('address')}")
    print(f"   Coordinates: ({location.get('latitude')}, {location.get('longitude')})")
    
    # Verify it will appear on map
    print(f"\n=== Map Filter Check ===")
    if updated['parent_project_id']:
        print("✅ Will appear on map (has parent_project_id)")
    elif updated['is_event']:
        print("✅ Will appear on map (is_event=true)")
    else:
        print("❌ Will NOT appear on map (no parent, not an event)")

else:
    print("⚠️ Unexpected structure - manual intervention needed")

# Final verification
cursor.execute("SELECT projects_id, title, is_event, parent_project_id FROM projects")
all_projects = cursor.fetchall()

print(f"\n=== All Projects in Database ({len(all_projects)}) ===")
for p in all_projects:
    marker = "📅 EVENT" if p['is_event'] else ("📋 PROJECT" if p['parent_project_id'] else "📁 PROGRAM")
    print(f"{marker}: {p['title']} (ID: {p['projects_id']})")

cursor.close()
conn.close()

print("\n✅ Done! Clear cache and refresh your browser.")
