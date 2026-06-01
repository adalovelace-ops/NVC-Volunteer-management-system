import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Check projects table
cur.execute("""
    SELECT projects_id, title, is_event, parent_project_id, program_id 
    FROM projects 
    ORDER BY is_event, parent_project_id NULLS FIRST
""")
rows = cur.fetchall()

print('\nProjects table:')
print('ID | Title | IsEvent | ParentProjectId | ProgramId')
print('-' * 120)
for r in rows:
    print(f'{r[0][:35]:35} | {r[1][:25]:25} | {str(r[2]):7} | {str(r[3] or "NULL")[:25]:25} | {str(r[4] or "NULL")[:25]:25}')

# Check programs table
cur.execute("SELECT programs_id, title FROM programs")
rows = cur.fetchall()

print('\n\nPrograms table:')
print('ID | Title')
print('-' * 70)
for r in rows:
    print(f'{r[0][:35]:35} | {r[1][:30]:30}')

conn.close()
