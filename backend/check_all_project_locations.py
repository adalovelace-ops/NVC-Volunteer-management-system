"""Check all project locations in database."""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

# Check all projects
cursor.execute("""
    SELECT 
        projects_id, 
        title, 
        is_event,
        location_region,
        location_city,
        location
    FROM projects 
    ORDER BY created_at DESC
""")

rows = cursor.fetchall()

print(f"\n=== All Projects Location Data ({len(rows)}) ===\n")

for row in rows:
    # Parse location JSON
    location = row['location']
    if isinstance(location, str):
        try:
            location = json.loads(location)
        except:
            location = {}
    
    lat = location.get('latitude') if location else None
    lon = location.get('longitude') if location else None
    
    print(f"{'EVENT' if row['is_event'] else 'PROJECT'}: {row['title']}")
    print(f"  ID: {row['projects_id']}")
    print(f"  Region: {row['location_region']}")
    print(f"  City: {row['location_city']}")
    print(f"  Coordinates: {lat}, {lon}")
    
    # Check if coordinates are in reasonable Philippines range
    # Philippines: Lat 4.5-21.5°N, Lon 116-127°E
    if lat and lon:
        if 4.5 <= lat <= 21.5 and 116 <= lon <= 127:
            # Check specific regions
            if 9.5 <= lat <= 11.0 and 122.5 <= lon <= 123.5:
                print("  📍 Location: Negros Island")
            elif 14.0 <= lat <= 15.0 and 120.5 <= lon <= 121.5:
                print("  📍 Location: Metro Manila/Luzon")
            else:
                print("  📍 Location: Philippines (other region)")
        else:
            print("  ⚠️  WARNING: Coordinates outside Philippines!")
    else:
        print("  ❌ No coordinates")
    print()

cursor.close()
conn.close()
