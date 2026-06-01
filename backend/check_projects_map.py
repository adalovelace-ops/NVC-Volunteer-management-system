import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

cursor.execute("""
    SELECT projects_id, title, is_event, parent_project_id, location
    FROM projects 
    ORDER BY created_at DESC 
    LIMIT 10
""")

projects = cursor.fetchall()
print(f'Total projects (showing first 10): {len(projects)}')
print()

for p in projects:
    print(f'ID: {p.get("projects_id")}')
    print(f'Title: {p.get("title")}')
    print(f'isEvent: {p.get("is_event")}')
    print(f'parentProjectId: {p.get("parent_project_id")}')
    location = p.get("location", {})
    if isinstance(location, dict):
        print(f'Location: {location.get("address")}')
        print(f'Latitude: {location.get("latitude")}')
        print(f'Longitude: {location.get("longitude")}')
    else:
        print(f'Location: {location}')
    print('-' * 50)

cursor.close()
conn.close()
