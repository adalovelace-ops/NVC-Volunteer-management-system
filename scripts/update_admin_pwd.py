import os
from dotenv import load_dotenv
load_dotenv()
import psycopg2

db_url = os.getenv("SUPABASE_DB_URL")
conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SELECT users_id, email, role, password FROM users WHERE LOWER(email) = 'nvc4090@gmail.com';")
rows = cur.fetchall()
print("Found rows:", rows)

new_pwd = "fwjo uart frvr ezeg"

if rows:
    u_id = rows[0][0]
    cur.execute("UPDATE users SET password = %s WHERE LOWER(email) = 'nvc4090@gmail.com';", (new_pwd,))
    conn.commit()
    print(f"Updated password for {u_id} to '{new_pwd}'")
else:
    cur.execute("""
        INSERT INTO users (users_id, email, password, role, name, approval_status, created_at)
        VALUES ('user-admin-nvc4090', 'nvc4090@gmail.com', %s, 'admin', 'NVC Admin', 'approved', NOW());
    """, (new_pwd,))
    conn.commit()
    print(f"Inserted user-admin-nvc4090 with password '{new_pwd}'")

conn.close()
