import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import get_postgres_connection
import json, traceback

with get_postgres_connection() as conn:
    with conn.cursor() as cur:
        # Check columns
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'admin_planning_calendars'
            ORDER BY ordinal_position
        """)
        cols = cur.fetchall()
        print("Columns:")
        for c in cols:
            print(f"  {c[0]} | {c[1]} | nullable={c[2]} | default={c[3]}")

        # Check existing rows
        cur.execute("SELECT COUNT(*) FROM admin_planning_calendars")
        count = cur.fetchone()[0]
        print(f"\nExisting rows: {count}")

        # Try a test insert using the correct PK column name
        print("\nTrying test insert with correct PK column...")
        try:
            cur.execute("""
                INSERT INTO admin_planning_calendars 
                (admin_planning_calendars_id, name, color, planning_items, created_at, updated_at)
                VALUES (%s, %s, %s, %s, NOW()::text, NOW()::text)
                ON CONFLICT (admin_planning_calendars_id) DO NOTHING
            """, ('test-cal-1', 'Test Calendar', '#4CAF50', json.dumps([])))
            conn.commit()
            print("✓ Insert succeeded")
            cur.execute("DELETE FROM admin_planning_calendars WHERE admin_planning_calendars_id = 'test-cal-1'")
            conn.commit()
            print("✓ Cleanup done")
        except Exception as e:
            print(f"✗ Insert failed: {e}")
            traceback.print_exc()
