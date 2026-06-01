"""Test volunteer lookup by user_id."""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

# Test the exact query the API should be using
user_id = "user-volunteer-1780189738"

print(f"\n=== Testing Volunteer Lookup for user_id: {user_id} ===\n")

# Try with snake_case (correct)
cursor.execute("""
    SELECT volunteers_id, name, user_id, email, registration_status
    FROM volunteers
    WHERE user_id = %s
""", (user_id,))

result = cursor.fetchone()

if result:
    print("✅ FOUND with snake_case (user_id):")
    print(f"   Volunteer ID: {result['volunteers_id']}")
    print(f"   Name: {result['name']}")
    print(f"   Email: {result['email']}")
    print(f"   User ID: {result['user_id']}")
    print(f"   Status: {result['registration_status']}")
else:
    print("❌ NOT FOUND with snake_case (user_id)")

print("\n" + "="*60 + "\n")

# Also check the project location
cursor.execute("""
    SELECT projects_id, title, location
    FROM projects
    WHERE title LIKE '%DISASTER RISK%'
""")

project = cursor.fetchone()
if project:
    import json
    location = json.loads(project['location']) if isinstance(project['location'], str) else project['location']
    print(f"Project: {project['title']}")
    print(f"Location JSON: {location}")
    print(f"Latitude: {location.get('latitude')}")
    print(f"Longitude: {location.get('longitude')}")

cursor.close()
conn.close()
