#!/usr/bin/env python3
"""Check how location is serialized in API response."""
import json
import sys
sys.path.insert(0, '.')
from db import get_connection

with get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute('''
        SELECT 
            projects_id,
            title,
            location
        FROM projects
        WHERE projects_id = 'project-1780217407655'
    ''')
    
    row = cursor.fetchone()
    if row:
        pid, title, loc = row
        print(f'Project: {title}')
        print(f'ID: {pid}')
        print(f'Location type: {type(loc).__name__}')
        print(f'Location repr: {repr(loc)}')
        
        if isinstance(loc, str):
            try:
                parsed = json.loads(loc)
                print(f'\n✓ Location is a JSON string')
                print(f'Parsed: {json.dumps(parsed, indent=2)}')
            except:
                print(f'\n✗ Location is a string but NOT valid JSON')
        else:
            print(f'\n✓ Location is already a Python object/dict')
            print(f'Location value: {loc}')
