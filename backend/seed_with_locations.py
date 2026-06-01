"""
Seed database with demo data including proper location fields
"""
import os
from dotenv import load_dotenv
import psycopg2
from datetime import datetime, timedelta

load_dotenv()

DATABASE_URL = os.getenv("SUPABASE_DB_URL")

print("[SEED] Connecting to database...")
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = False
cur = conn.cursor()

try:
    now = datetime.now().isoformat()
    future = (datetime.now() + timedelta(days=30)).isoformat()
    
    print("[SEED] Creating users...")
    # Admin user - matches Quick Demo Sign In
    cur.execute("""
        INSERT INTO users (users_id, email, name, role, password, approval_status, pillars_of_interest, created_at)
        VALUES ('admin-1', 'admin@nvc.org', 'Admin Account', 'admin', 'admin123', 'Approved', '{}', %s)
    """, (now,))
    
    # Volunteer user - matches Quick Demo Sign In
    cur.execute("""
        INSERT INTO users (users_id, email, name, role, password, approval_status, pillars_of_interest, created_at)
        VALUES ('vol-1', 'volunteer@example.com', 'Volunteer Account', 'volunteer', 'volunteer123', 'Approved', '{}', %s)
    """, (now,))
    
    # Additional volunteer users
    volunteers_data = [
        ('vol-2', 'thea.salinas@example.com', 'Thea M Salinas', 'volunteer123'),
        ('vol-3', 'john.doe@example.com', 'John Doe', 'volunteer123'),
        ('vol-4', 'jane.smith@example.com', 'Jane Smith', 'volunteer123'),
        ('vol-5', 'mike.jones@example.com', 'Mike Jones', 'volunteer123'),
    ]
    
    for vol_id, email, name, password in volunteers_data:
        cur.execute("""
            INSERT INTO users (users_id, email, name, role, password, approval_status, pillars_of_interest, created_at)
            VALUES (%s, %s, %s, 'volunteer', %s, 'Approved', '{}', %s)
        """, (vol_id, email, name, password, now))
    
    # Partner users - matches Quick Demo Sign In
    partners_data = [
        ('partner-1', 'partnerships@pbsp.org.ph', 'PBSP', 'partner123'),
        ('partner-2', 'partnerships@jollibeefoundation.org', 'Jollibee Foundation', 'partner123'),
        ('partner-3', 'partner@livelihoods.org', 'Kabankalan LGU', 'partner123'),
        ('partner-4', 'partner4@example.com', 'Kalipay Foundation', 'partner123'),
    ]
    
    for partner_id, email, name, password in partners_data:
        cur.execute("""
            INSERT INTO users (users_id, email, name, role, password, approval_status, pillars_of_interest, created_at)
            VALUES (%s, %s, %s, 'partner', %s, 'Approved', '{}', %s)
        """, (partner_id, email, name, password, now))
    
    print("[SEED] Creating volunteers...")
    # Main volunteer - matches Quick Demo Sign In
    cur.execute("""
        INSERT INTO volunteers (
            volunteers_id, user_id, name, email, phone, 
            skills, availability, past_projects, affiliations,
            total_hours_contributed, rating,
            registration_status, created_at
        )
        VALUES ('vol-1', 'vol-1', 'Volunteer Account', 'volunteer@example.com', '09123456789', '{}', '{}', '{}', '{}', 0, 0, 'Approved', %s)
    """, (now,))
    
    # Additional volunteers
    for vol_id, email, name, password in volunteers_data:
        cur.execute("""
            INSERT INTO volunteers (
                volunteers_id, user_id, name, email, phone, 
                skills, availability, past_projects, affiliations,
                total_hours_contributed, rating,
                registration_status, created_at
            )
            VALUES (%s, %s, %s, %s, '09123456789', '{}', '{}', '{}', '{}', 0, 0, 'Approved', %s)
        """, (vol_id, vol_id, name, email, now))
    
    print("[SEED] Creating partners...")
    for partner_id, email, name, password in partners_data:
        cur.execute("""
            INSERT INTO partners (
                partners_id, owner_user_id, name, contact_email, 
                advocacy_focus, registration_documents,
                status, created_at
            )
            VALUES (%s, %s, %s, %s, '{}', '[]', 'Active', %s)
        """, (partner_id, partner_id, name, email, now))
    
    print("[SEED] Creating projects with location fields...")
    projects_data = [
        ('project-1', 'Community Education Initiative', 'Education program for local communities', 'partner-1', 'Negros Occidental', 'Bacolod City', None, 'Education'),
        ('project-2', 'Kabankalan Livelihood Starter Initiative', 'Livelihood support program', 'partner-1', 'Negros Occidental', 'Kabankalan City', None, 'Livelihood'),
        ('project-3', 'Baybay Nutrition Learning Program', 'Nutrition education program', 'partner-2', 'Negros Occidental', 'Talisay City', None, 'Nutrition'),
        ('project-4', 'Education Project Proposal sample 2', 'Sample education project', 'partner-3', 'Region VII (Central Visayas)', 'Anda', None, 'Education'),
        ('project-5', 'Livelihood Project Proposal', 'Livelihood initiative', 'partner-4', 'MIMAROPA Region', 'Agutaya', None, 'Livelihood'),
        ('project-6', 'Nutrition Project Proposal', 'Nutrition program', 'partner-2', 'Region V (Bicol Region)', 'Baleno', None, 'Nutrition'),
        ('project-7', 'N/A', 'General project', 'partner-1', 'Negros Island Region (NIR)', 'Bindoy', None, 'Education'),
        ('project-8', 'E2E Test Education Program', 'Test program', 'partner-3', 'Negros Occidental', 'Kabankalan City', None, 'Education'),
    ]
    
    for proj_id, title, desc, partner_id, region, city, barangay, category in projects_data:
        cur.execute("""
            INSERT INTO projects (
                projects_id, title, description, partner_id, 
                location, location_region, location_city, location_barangay,
                status, category, is_event, image_hidden, start_date, end_date, 
                volunteers_needed, volunteers, joined_user_ids, skills_needed, internal_tasks,
                created_at
            )
            VALUES (%s, %s, %s, %s, '{"latitude": 10.0, "longitude": 123.0, "address": ""}', %s, %s, %s, 'Planning', %s, false, false, %s, %s, 5, '{}', '{}', '{}', '[]', %s)
        """, (proj_id, title, desc, partner_id, region, city, barangay, category, now, future, now))
    
    print("[SEED] Creating events with location fields...")
    events_data = [
        ('event-1', 'Assessment', 'Assessment event', 'project-7', 'Negros Island Region (NIR)', 'Bindoy', 'Camudlas'),
        ('event-2', 'Education Workshop - Morning Session', 'Morning workshop', 'project-1', 'Negros Occidental', 'Bacolod City', None),
        ('event-3', 'Education Workshop - Afternoon Session', 'Afternoon workshop', 'project-1', 'Negros Occidental', 'Bacolod City', None),
        ('event-4', 'Livelihood Kickoff Workshop', 'Kickoff event', 'project-2', 'Negros Occidental', 'Kabankalan City', None),
        ('event-5', 'Quarterly Assessment', 'Quarterly review', 'project-3', 'Negros Occidental', 'Talisay City', 'Baybay'),
    ]
    
    for event_id, title, desc, parent_id, region, city, barangay in events_data:
        cur.execute("""
            INSERT INTO events (
                events_id, title, description, parent_project_id,
                location, location_region, location_city, location_barangay,
                status, is_event, image_hidden, start_date, end_date,
                volunteers_needed, volunteers, joined_user_ids, skills_needed, internal_tasks,
                created_at
            )
            VALUES (%s, %s, %s, %s, '{"latitude": 10.0, "longitude": 123.0, "address": ""}', %s, %s, %s, 'Planning', true, false, %s, %s, 3, '{}', '{}', '{}', '[]', %s)
        """, (event_id, title, desc, parent_id, region, city, barangay, now, future, now))
    
    print("[SEED] Creating messages...")
    cur.execute("""
        INSERT INTO messages (id, sender_id, recipient_id, subject, body, read, created_at)
        VALUES ('msg-1', 'admin-1', 'vol-1', 'Welcome!', 'Welcome to the volunteer system', false, %s)
    """, (now,))
    
    conn.commit()
    print("[SEED] ✓ Database seeded successfully!")
    print(f"[SEED] Created:")
    print(f"  - 11 users (1 admin, 5 volunteers, 4 partners)")
    print(f"  - 8 projects with location fields")
    print(f"  - 5 events with location fields")
    print(f"  - 1 message")
    
except Exception as e:
    conn.rollback()
    print(f"[SEED] ✗ Error: {e}")
    raise
finally:
    cur.close()
    conn.close()
