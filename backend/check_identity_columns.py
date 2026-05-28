"""Check which tables have identity columns"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("SUPABASE_DB_URL_FALLBACK") or os.getenv("SUPABASE_DB_URL")
conn = psycopg.connect(db_url)

with conn.cursor() as cur:
    cur.execute("""
        SELECT table_name, column_name, data_type, is_identity
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'id'
        ORDER BY table_name;
    """)
    
    print("Tables with 'id' column:")
    print("-" * 80)
    for row in cur.fetchall():
        table, col, dtype, is_identity = row
        marker = " *** IDENTITY ***" if is_identity == 'YES' else ""
        print(f"{table:40} {col:10} {dtype:15} {is_identity}{marker}")

conn.close()
