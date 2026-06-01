#!/usr/bin/env python3
"""Direct SQL query to check database contents"""

import os
from dotenv import load_dotenv
import psycopg

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_DB_URL')
conn = psycopg.connect(SUPABASE_URL)

with conn.cursor() as cur:
    # Check programs table
    cur.execute("SELECT COUNT(*) FROM programs")
    row = cur.fetchone()
    print(f"Programs table: {row[0]} rows")
    
    # Show all programs
    cur.execute("SELECT programs_id, title FROM programs ORDER BY programs_id")
    for row in cur.fetchall():
        print(f"  - {row[0]}: {row[1]}")
    
    print()
    
    # Check projects table
    cur.execute("SELECT COUNT(*) FROM projects")
    row = cur.fetchone()
    print(f"Projects table: {row[0]} rows")
    
    # Show all projects
    cur.execute("SELECT projects_id, title, parent_project_id FROM projects ORDER BY projects_id")
    for row in cur.fetchall():
        print(f"  - {row[0]}: {row[1]} (parent: {row[2]})")
    
    print()
    
    # Check events table
    cur.execute("SELECT COUNT(*) FROM events")
    row = cur.fetchone()
    print(f"Events table: {row[0]} rows")
    
    # Show all events
    cur.execute("SELECT events_id, title, parent_project_id FROM events ORDER BY events_id")
    for row in cur.fetchall():
        print(f"  - {row[0]}: {row[1]} (parent: {row[2]})")

conn.close()
