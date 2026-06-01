"""Force re-seed the database by clearing all tables and running auto_seed"""
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

DATABASE_URL = os.getenv("SUPABASE_DB_URL")

print("[FORCE RESEED] Connecting to database...")
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

# Delete all data from tables (in correct order to avoid foreign key issues)
tables_to_clear = [
    'volunteer_time_logs',
    'volunteer_event_joins',
    'volunteer_matches',
    'partner_project_applications',
    'reports',
    'messages',
    'project_group_messages',
    'status_updates',
    'admin_planning_items',
    'admin_planning_calendars',
    'events',
    'projects',
    'programs',
    'program_tracks',
    'skills',
    'tasks',
    'volunteers',
    'partners',
    'users',
]

print("[FORCE RESEED] Clearing all tables...")
for table in tables_to_clear:
    try:
        cur.execute(f"DELETE FROM {table}")
        print(f"  ✓ Cleared {table}")
    except Exception as e:
        print(f"  ✗ Error clearing {table}: {e}")

cur.close()
conn.close()

print("[FORCE RESEED] All tables cleared. Now running auto_seed...")
os.system("python auto_seed.py")
