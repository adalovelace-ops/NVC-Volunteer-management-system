import requests

response = requests.get('http://localhost:8000/projects/snapshot')
data = response.json()

projects = data.get('projects', [])

print("Projects with parent IDs:")
for p in projects:
    parent = p.get('parentProjectId')
    is_event = p.get('isEvent', False)
    marker = ' [EVENT]' if is_event else ''
    print(f'  {p.get("title")}{marker}')
    print(f'    ID: {p.get("id")}')
    print(f'    parentProjectId: {parent or "None"}')
    print()

print("\nPrograms table:")
tracks = data.get('programTracks', [])
for t in tracks:
    print(f'  {t.get("title")}')
    print(f'    ID: {t.get("id")}')
    print()
