#!/usr/bin/env python3
import os
from dotenv import load_dotenv
load_dotenv()
try:
    import psycopg
except Exception as e:
    print('psycopg not available:', e)
    raise

db_url = os.getenv('SUPABASE_DB_URL')
if not db_url:
    print('No DB URL')
    raise SystemExit(1)

conn = psycopg.connect(db_url, connect_timeout=5)
cur = conn.cursor()

tables = ['partner_project_applications','partner_reports','projects','events','admin_planning_calendars','volunteer_time_logs']
for t in tables:
    try:
        cur.execute(f'SELECT count(*) FROM {t}')
        c = cur.fetchone()[0]
        print(f'{t}: {c} records')
    except Exception as e:
        print(f'{t}: ERROR ({e})')

conn.close()
