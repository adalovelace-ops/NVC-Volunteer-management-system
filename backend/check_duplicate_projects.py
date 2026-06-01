import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv('SUPABASE_DB_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# First, check the table structure
cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'projects'
    ORDER BY ordinal_position
""")
columns = cur.fetchall()
print("\n=== Projects table columns ===")
for col in columns:
    print(f"{col[0]}: {col[1]}")

# Check for projects with "Nutrition" in the title
cur.execute("""
    SELECT project_id, title, description, status, program_id, created_at 
    FROM projects 
    WHERE title LIKE '%Nutrition%' 
    ORDER BY created_at
""")

rows = cur.fetchall()
print(f"\n=== Found {len(rows)} projects with 'Nutrition' in title ===\n")
for row in rows:
    print(f"Project ID: {row[0]}")
    print(f"Title: {row[1]}")
    print(f"Description: {row[2]}")
    print(f"Status: {row[3]}")
    print(f"Program ID: {row[4]}")
    print(f"Created: {row[5]}")
    print("-" * 60)

cur.close()
conn.close()
