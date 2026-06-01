"""Check location data for DISASTER RISK PROTECTION TRAINING project."""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

# Check the DISASTER RISK PROTECTION TRAINING project
cursor.execute("""
    SELECT 
        projects_id, 
        title, 
        is_event,
        location_region,
        location_city,
        location_barangay,
        location
    FROM projects 
    WHERE title LIKE '%DISASTER RISK%'
    ORDER BY created_at DESC
""")

rows = cursor.fetchall()

print(f"\n=== DISASTER RISK Projects Location Data ===\n")

for row in rows:
    print(f"{'EVENT' if row['is_event'] else 'PROJECT'}: {row['title']}")
    print(f"  ID: {row['projects_id']}")
    print(f"  Region: {row['location_region']}")
    print(f"  City: {row['location_city']}")
    print(f"  Barangay: {row['location_barangay']}")
    
    # Parse location JSON
    location = row['location']
    if isinstance(location, str):
        try:
            location = json.loads(location)
        except:
            location = {}
    
    lat = location.get('latitude') if location else None
    lon = location.get('longitude') if location else None
    address = location.get('address') if location else None
    
    print(f"  Address: {address}")
    print(f"  Latitude: {lat}")
    print(f"  Longitude: {lon}")
    print()
    
    # Check if coordinates are correct for Negros
    # Negros Island is approximately:
    # Latitude: 9.5° to 11° N
    # Longitude: 122.5° to 123.5° E
    
    if lat and lon:
        if 9.5 <= lat <= 11.0 and 122.5 <= lon <= 123.5:
            print("  ✅ Coordinates are in Negros Island region")
        else:
            print("  ❌ Coordinates are NOT in Negros Island region!")
            print("     Expected: Lat 9.5-11.0, Lon 122.5-123.5")
            print("     Bago City, Negros Occidental coordinates: ~10.5376° N, 122.8354° E")
    print()

cursor.close()
conn.close()
