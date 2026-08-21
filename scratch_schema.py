import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
try:
    from db import get_postgres_connection, load_environment
    load_environment()
    with get_postgres_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'partners'")
            print("Partners columns:", [row[0] for row in cur.fetchall()])
            
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'partner_project_applications'")
            print("Apps columns:", [row[0] for row in cur.fetchall()])
            
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
            print("Users columns:", [row[0] for row in cur.fetchall()])
