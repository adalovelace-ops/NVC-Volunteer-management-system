"""Check column names in projects table."""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(DB_URL)
cursor = conn.cursor(cursor_factory=RealDictCursor)

# Get column names
cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'projects'
    ORDER BY ordinal_position
""")

columns = cursor.fetchall()

print("\n=== Projects Table Columns ===\n")
for col in columns:
    print(f"{col['column_name']}: {col['data_type']}")

cursor.close()
conn.close()
