#!/usr/bin/env python3
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'backend'))

from backend.db import get_postgres_connection, load_environment

load_environment()
conn = get_postgres_connection()

tables_to_check = [
    'volunteerprojectjoins', 'volunteermatches', 'volunteertimelogs',
    'partnerprojectapplications', 'partnerreports', 'volunteers', 'partners',
    'messages', 'projectgroupmessages'
]

with conn.cursor() as cur:
    for table in tables_to_check:
        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
        cols = [row[0] for row in cur.fetchall()]
        print(f"{table}: {cols}")