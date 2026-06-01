#!/usr/bin/env python3
import os
from dotenv import load_dotenv
import psycopg

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_DB_URL')
conn = psycopg.connect(SUPABASE_URL)
with conn.cursor() as cur:
    cur.execute('SELECT * FROM projects LIMIT 1')
    print('columns:', [d.name for d in cur.description])
    row = cur.fetchone()
    print('row:', row)
conn.close()
