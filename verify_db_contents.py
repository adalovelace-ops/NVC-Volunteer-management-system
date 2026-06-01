#!/usr/bin/env python3
"""Verify database has projects and events with map coordinates"""

import os
from dotenv import load_dotenv
import psycopg

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_DB_URL')
conn = psycopg.connect(SUPABASE_URL)

from backend.app_storage_seed import get_postgres_hot_storage_collection

projects = get_postgres_hot_storage_collection(conn, 'projects')
events = get_postgres_hot_storage_collection(conn, 'events')
programs = get_postgres_hot_storage_collection(conn, 'programs')

print('Database contents:')
print(f'Programs: {len(programs)}')
print(f'Projects: {len(projects)}')
print(f'Events: {len(events)}')

print('\nProjects and Events that should show on map:')
for p in projects:
    loc = p.get('location', {})
    if loc.get('latitude'):
        print(f'  PROJECT: {p.get("id")}: {p.get("title")}')
        print(f'    Location: {loc}')

for e in events:
    loc = e.get('location', {})
    if loc.get('latitude'):
        print(f'  EVENT: {e.get("id")}: {e.get("title")}')
        print(f'    Location: {loc}')

conn.close()
