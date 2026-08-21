#!/usr/bin/env python3
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'backend'))

from backend.db import get_postgres_connection, load_environment

load_environment()
conn = get_postgres_connection()

with conn.cursor() as cur:
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
    print("users table columns:")
    for row in cur.fetchall():
        print(f"  {row[0]}")
    
    # Check what tables exist
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
    print("\nAll tables:")
    for row in cur.fetchall():
        print(f"  {row[0]}")