"""Test what the API returns for project location."""
import requests
import json

# Test the API endpoint
url = "http://localhost:8000/projects/snapshot"

try:
    response = requests.get(url)
    response.raise_for_status()
    data = response.json()
    
    projects = data.get('projects', [])
    
    print(f"\n=== API Response - Projects ({len(projects)}) ===\n")
    
    for project in projects:
        if 'DISASTER' in project.get('title', '').upper():
            print(f"Project: {project['title']}")
            print(f"ID: {project['id']}")
            
            location = project.get('location', {})
            print(f"\nLocation object:")
            print(json.dumps(location, indent=2))
            
            if isinstance(location, dict):
                lat = location.get('latitude')
                lon = location.get('longitude')
                address = location.get('address')
                
                print(f"\nParsed values:")
                print(f"  Latitude: {lat} (type: {type(lat).__name__})")
                print(f"  Longitude: {lon} (type: {type(lon).__name__})")
                print(f"  Address: {address}")
                
                # Check if coordinates are correct for Negros
                if lat and lon:
                    if 9.5 <= lat <= 11.0 and 122.5 <= lon <= 123.5:
                        print(f"\n  ✅ Coordinates are in Negros Island region")
                    else:
                        print(f"\n  ❌ Coordinates are NOT in Negros Island region!")
                        print(f"     Expected: Lat 9.5-11.0, Lon 122.5-123.5")
                        print(f"     Got: Lat {lat}, Lon {lon}")
            
            print("\n" + "="*60 + "\n")
            
except requests.exceptions.ConnectionError:
    print("\n❌ ERROR: Cannot connect to API at http://localhost:8000")
    print("   Make sure the backend server is running!")
except Exception as e:
    print(f"\n❌ ERROR: {e}")
