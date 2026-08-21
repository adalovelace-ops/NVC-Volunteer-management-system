import sys
import os
import json
sys.path.append(os.path.join(os.getcwd(), 'backend'))
try:
    from db import get_postgres_connection, load_environment
    load_environment()
    with get_postgres_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM projects WHERE description ILIKE '%kalipay%' OR title ILIKE '%kalipay%'")
            print(f"Deleted {cur.rowcount} projects with kalipay.")
            
            cur.execute("DELETE FROM projects WHERE description ILIKE '%pbsp%' OR title ILIKE '%pbsp%'")
            print(f"Deleted {cur.rowcount} projects with pbsp.")
            
            cur.execute("DELETE FROM events WHERE description ILIKE '%kalipay%' OR title ILIKE '%kalipay%'")
            print(f"Deleted {cur.rowcount} events with kalipay.")
            
            cur.execute("DELETE FROM programs WHERE description ILIKE '%kalipay%' OR title ILIKE '%kalipay%'")
            print(f"Deleted {cur.rowcount} programs with kalipay.")
            conn.commit()
except Exception as e:
    print(f'Error: {e}')
