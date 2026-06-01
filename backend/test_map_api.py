"""
Test if the API returns the project correctly for the map
"""
import requests
import json

# Test the projects snapshot endpoint
try:
    response = requests.get('http://localhost:8000/projects/snapshot')
    
    if response.status_code == 200:
        data = response.json()
        projects = data.get('projects', [])
        
        print(f"✅ API Response Status: {response.status_code}")
        print(f"Total projects returned: {len(projects)}\n")
        
        if projects:
            for project in projects:
                print(f"Project: {project.get('title')}")
                print(f"  ID: {project.get('id')}")
                print(f"  isEvent: {project.get('isEvent')}")
                print(f"  parentProjectId: {project.get('parentProjectId')}")
                
                location = project.get('location', {})
                print(f"  Location: {location.get('address')}")
                print(f"  Coordinates: ({location.get('latitude')}, {location.get('longitude')})")
                print()
                
                # Check if it will pass getMappedProjects filter
                if project.get('parentProjectId'):
                    print("  ✅ Will appear on map (has parentProjectId)")
                elif project.get('isEvent'):
                    print("  ✅ Will appear on map (isEvent=true)")
                else:
                    print("  ❌ Will NOT appear on map")
                print()
        else:
            print("⚠️ No projects returned from API")
    else:
        print(f"❌ API Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Error connecting to API: {e}")
    print("\nMake sure the backend is running on http://localhost:8000")
