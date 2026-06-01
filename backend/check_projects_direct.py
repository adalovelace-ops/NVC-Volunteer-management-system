import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Check projects count
    cur.execute("SELECT COUNT(*) FROM projects")
    project_count = cur.fetchone()[0]
    print(f"Projects: {project_count} records")
    
    # Check events count  
    cur.execute("SELECT COUNT(*) FROM events")
    event_count = cur.fetchone()[0]
    print(f"Events: {event_count} records")
    
    # Show first few projects
    cur.execute("SELECT id, title, location_region, location_city, location_barangay FROM projects LIMIT 5")
    projects = cur.fetchall()
    print("\nFirst 5 projects:")
    for p in projects:
        print(f"  {p[0]}: {p[1]} | Region: {p[2]} | City: {p[3]} | Barangay: {p[4]}")
    
    # Show first few events
    cur.execute("SELECT id, title, parent_project_id, location_region, location_city, location_barangay FROM events LIMIT 5")
    events = cur.fetchall()
    print("\nFirst 5 events:")
    for e in events:
        print(f"  {e[0]}: {e[1]} | Parent: {e[2]} | Region: {e[3]} | City: {e[4]} | Barangay: {e[5]}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
