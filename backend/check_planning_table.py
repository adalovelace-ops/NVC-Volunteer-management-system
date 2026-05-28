import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import get_postgres_connection

with get_postgres_connection() as conn:
    with conn.cursor() as cur:
        # Check if table exists
        cur.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'admin_planning_calendars'
        """)
        exists = cur.fetchone()
        print(f"admin_planning_calendars exists: {bool(exists)}")

        # List all tables
        cur.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' ORDER BY table_name
        """)
        tables = [r[0] for r in cur.fetchall()]
        print(f"\nAll tables ({len(tables)}):")
        for t in tables:
            print(f"  {t}")
