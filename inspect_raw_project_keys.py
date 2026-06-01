#!/usr/bin/env python3
"""Inspect raw project dict keys and values"""

import os
from dotenv import load_dotenv
import psycopg

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_DB_URL')
conn = psycopg.connect(SUPABASE_URL)

from backend.app_storage_seed import get_postgres_hot_storage_collection

projects = get_postgres_hot_storage_collection(conn, 'projects')
print(f'Projects count: {len(projects)}')
for p in projects:
    print('---')
    for key in sorted(p.keys()):
        print(f'{key}: {repr(p[key])}')
    print('isEvent via get:', p.get('isEvent'))
    print('is_event via get:', p.get('is_event'))
    print('parentProjectId via get:', p.get('parentProjectId'))
    print('parent_project_id via get:', p.get('parent_project_id'))

conn.close()
