#!/usr/bin/env python3
"""Test what the frontend would see for address resolution."""
import json
import sys
sys.path.insert(0, '.')

# Simulate the frontend's inferCoordinatesFromPlace logic
KNOWN_COORDINATES = {
    'bacolod': (10.6765, 122.9509),
    'bacolod city': (10.6765, 122.9509),
    'kabankalan': (10.6711, 122.9534),
    'philippines': (12.8797, 121.774),
    'negros': (10.5, 123.0),
    'negros occidental': (10.5, 123.0),
    'negros island region': (10.68, 122.97),
}

def normalize(text):
    """Normalize a place name like the frontend does."""
    return text.lower().replace('[^a-z0-9]+', ' ').strip() if text else ''

# Test the DISASTER project
project_address = "Bacolod City, Negros Occidental"
normalized = normalize(project_address)

print(f"\nProject Address: {project_address}")
print(f"Normalized: {normalized}")

# Check if it would match any known location
for keyword, coords in KNOWN_COORDINATES.items():
    if keyword in normalized or normalized in keyword:
        print(f"✓ Matches keyword '{keyword}': {coords}")
        break
else:
    print("✗ No keyword match found")

# Now test what coordinates it gets
from db import get_connection

with get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute('''
        SELECT 
            projects_id,
            title,
            location,
            location_region,
            location_city,
            location_barangay
        FROM projects
        WHERE projects_id = 'project-1780217407655'
    ''')
    
    row = cursor.fetchone()
    if row:
        pid, title, loc_json, region, city, brgy = row
        loc = json.loads(loc_json) if isinstance(loc_json, str) else loc_json
        
        print(f"\nDatabase values:")
        print(f"  location.address: {loc.get('address')}")
        print(f"  location_region: {region}")
        print(f"  location_city: {city}")
        print(f"  location_barangay: {brgy}")
        
        print(f"\nCoordinates from location object:")
        print(f"  latitude: {loc.get('latitude')}")
        print(f"  longitude: {loc.get('longitude')}")
