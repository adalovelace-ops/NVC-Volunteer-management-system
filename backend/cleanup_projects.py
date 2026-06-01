"""
Clean up all projects except the original Nutrition Test Project
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

# Get all projects
cursor.execute("""
    SELECT projects_id, title, parent_project_id, is_event
    FROM projects 
    ORDER BY created_at ASC
""")

all_projects = cursor.fetchall()
print(f"Found {len(all_projects)} total projects:\n")

for p in all_projects:
    marker = "📁 PROGRAM" if not p['parent_project_id'] and not p['is_event'] else ("📅 EVENT" if p['is_event'] else "📋 PROJECT")
    print(f"{marker}: {p['title']}")
    print(f"  ID: {p['projects_id']}")
    print(f"  Parent: {p['parent_project_id']}")
    print()

# Keep only the original Nutrition Test Project
original_id = 'project-1780244100039'

# Delete all other projects
cursor.execute("""
    DELETE FROM projects 
    WHERE projects_id != %s
    RETURNING projects_id, title
""", (original_id,))

deleted = cursor.fetchall()
conn.commit()

if deleted:
    print(f"\n✅ Deleted {len(deleted)} projects:")
    for p in deleted:
        print(f"  - {p['title']} (ID: {p['projects_id']})")
else:
    print("\n✅ No projects to delete")

# Verify
cursor.execute("SELECT projects_id, title FROM projects")
remaining = cursor.fetchall()

print(f"\n=== Remaining Projects ({len(remaining)}) ===")
for p in remaining:
    print(f"  - {p['title']} (ID: {p['projects_id']})")

cursor.close()
conn.close()

print("\n✅ Cleanup complete!")
