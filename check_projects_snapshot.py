import requests

response = requests.get('http://localhost:8000/projects/snapshot')
data = response.json()

projects = data.get('projects', [])
print(f'Total projects: {len(projects)}\n')

for p in projects:
    is_event = p.get('isEvent', False)
    marker = ' [EVENT]' if is_event else ''
    print(f'  - {p.get("title")}{marker}')
    print(f'    ID: {p.get("id")}')
    print()
