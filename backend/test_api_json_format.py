#!/usr/bin/env python3
"""Test what exact JSON the API returns."""
import json
import sys
sys.path.insert(0, '.')
from db import get_connection
import requests

print("\n=== Testing API Response Format ===\n")

try:
    response = requests.get("http://localhost:8000/projects/snapshot")
    data = response.json()
    
    for project in data.get('projects', []):
        if 'DISASTER' in project.get('title', '').upper():
            print(f"Project: {project['title']}")
            location = project.get('location', {})
            
            print(f"\nLocation object from API:")
            print(json.dumps(location, indent=2))
            
            if isinstance(location, dict):
                lat = location.get('latitude')
                lon = location.get('longitude')
                
                print(f"\nCoordinate types:")
                print(f"  latitude: {type(lat).__name__} = {repr(lat)}")
                print(f"  longitude: {type(lon).__name__} = {repr(lon)}")
                
                # Check if they're actually numbers
                if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
                    print("\n✓ Coordinates are numbers (correct)")
                else:
                    print("\n✗ Coordinates are strings (WRONG!)")
                    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
