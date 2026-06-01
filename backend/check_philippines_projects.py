#!/usr/bin/env python3
"""Find all projects with Philippines in location."""
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
            is_event,
            location
        FROM projects
        WHERE location::text LIKE '%Philippines%'
           OR title ILIKE '%philippines%'
        ORDER BY created_at DESC
    ''')
    
    rows = cursor.fetchall()
    print(f'\nProjects/Events with Philippines in location or title ({len(rows)}):\n')
    
    for pid, title, is_event, loc_json in rows:
        project_type = 'EVENT' if is_event else 'PROJECT'
        print(f'{project_type}: {title}')
        print(f'  ID: {pid}')
        if loc_json:
            loc = json.loads(loc_json) if isinstance(loc_json, str) else loc_json
            print(f'  Location: {json.dumps(loc)}')
        else:
            print(f'  Location: NO DATA')
        print()
