"""
Seed Quick Demo Sign In accounts to the database.
Creates the exact accounts shown in LoginScreen.tsx for testing.
"""
import os
import sys
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL
DB_URL = os.getenv('SUPABASE_DB_URL')
if not DB_URL:
    print("ERROR: SUPABASE_DB_URL not found in environment variables")
    sys.exit(1)

print(f"Connecting to database...")

# Quick Demo Sign In accounts from LoginScreen.tsx
DEMO_ACCOUNTS = [
    {
        'email': 'admin@nvc.org',
        'password': 'admin123',
        'role': 'admin',
        'name': 'Admin Account',
        'phone': '+639171234567',
        'approval_status': 'approved',
        'user_type': 'Adult',
        'pillars_of_interest': ['Education', 'Livelihood', 'Nutrition'],
    },
    {
        'email': 'volunteer@example.com',
        'password': 'volunteer123',
        'role': 'volunteer',
        'name': 'Volunteer Account',
        'phone': '+639171234568',
        'approval_status': 'approved',
        'user_type': 'Student',
        'pillars_of_interest': ['Education'],
    },
    {
        'email': 'partnerships@pbsp.org.ph',
        'password': 'partner123',
        'role': 'partner',
        'name': 'PBSP',
        'phone': '+639171234569',
        'approval_status': 'approved',
        'user_type': 'Adult',
        'pillars_of_interest': ['Education', 'Livelihood'],
    },
    {
        'email': 'partnerships@jollibeefoundation.org',
        'password': 'partner123',
        'role': 'partner',
        'name': 'Jollibee Foundation',
        'phone': '+639171234570',
        'approval_status': 'approved',
        'user_type': 'Adult',
        'pillars_of_interest': ['Nutrition'],
    },
    {
        'email': 'partner@livelihoods.org',
        'password': 'partner123',
        'role': 'partner',
        'name': 'Kabankalan LGU',
        'phone': '+639171234571',
        'approval_status': 'approved',
        'user_type': 'Adult',
        'pillars_of_interest': ['Livelihood'],
    },
]

def seed_demo_accounts():
    """Seed Quick Demo Sign In accounts to the database."""
    conn = None
    try:
        # Connect to database
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("Connected to database successfully")
        
        # Check current users
        cursor.execute("SELECT email FROM users")
        existing_emails = {row['email'] for row in cursor.fetchall()}
        print(f"Found {len(existing_emails)} existing users")
        
        # Insert demo accounts
        inserted_count = 0
        updated_count = 0
        
        for account in DEMO_ACCOUNTS:
            email = account['email']
            
            if email in existing_emails:
                # Update existing account
                print(f"Updating existing account: {email}")
                cursor.execute("""
                    UPDATE users 
                    SET password = %s,
                        role = %s,
                        name = %s,
                        phone = %s,
                        approval_status = %s,
                        user_type = %s,
                        pillars_of_interest = %s
                    WHERE email = %s
                """, (
                    account['password'],
                    account['role'],
                    account['name'],
                    account['phone'],
                    account['approval_status'],
                    account['user_type'],
                    account['pillars_of_interest'],
                    email
                ))
                updated_count += 1
            else:
                # Insert new account - generate unique ID using users_id with unique timestamp
                import time
                unique_timestamp = int(time.time() * 1000000)  # Microseconds for uniqueness
                user_id = f"user-{email.split('@')[0]}-{unique_timestamp}"
                print(f"Creating new account: {email} (ID: {user_id})")
                cursor.execute("""
                    INSERT INTO users (
                        users_id, email, password, role, name, phone,
                        approval_status, user_type, pillars_of_interest,
                        created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    user_id,
                    email,
                    account['password'],
                    account['role'],
                    account['name'],
                    account['phone'],
                    account['approval_status'],
                    account['user_type'],
                    account['pillars_of_interest'],
                    datetime.utcnow().isoformat()
                ))
                inserted_count += 1
        
        # Commit changes
        conn.commit()
        
        print(f"\n✅ Demo accounts seeded successfully!")
        print(f"   - Created: {inserted_count} accounts")
        print(f"   - Updated: {updated_count} accounts")
        print(f"\nYou can now use Quick Demo Sign In buttons to log in:")
        print(f"   Admin: admin@nvc.org / admin123")
        print(f"   Volunteer: volunteer@example.com / volunteer123")
        print(f"   Partners: Use partner emails with password 'partner123'")
        
    except Exception as e:
        print(f"\n❌ Error seeding demo accounts: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()
            print("\nDatabase connection closed")

if __name__ == '__main__':
    seed_demo_accounts()
