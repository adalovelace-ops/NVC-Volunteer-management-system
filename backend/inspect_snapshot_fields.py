#!/usr/bin/env python3
import sys, json
sys.path.insert(0, '.')
import requests

response = requests.get('http://localhost:8000/projects/snapshot')
response.raise_for_status()
data = response.json()
for project in data.get('projects', []):
    if 'DISASTER' in project.get('title', '').upper():
        print('PROJECT', project.get('title'))
        print('FIELDS:', sorted(project.keys()))
        print('locationRegion:', project.get('locationRegion'))
        print('locationCity:', project.get('locationCity'))
        print('locationBarangay:', project.get('locationBarangay'))
        print('location.address:', project.get('location', {}).get('address'))
        print('location.latitude:', project.get('location', {}).get('latitude'))
        print('location.longitude:', project.get('location', {}).get('longitude'))
        print('raw location:', json.dumps(project.get('location'), indent=2))
        break
