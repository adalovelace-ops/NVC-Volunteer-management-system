"""
Check programs directly in the database table.
"""
from dotenv import load_dotenv
from db import get_connection

load_dotenv()

def check_programs_table():
    with get_connection() as connection:
        with connection.cursor() as cursor:
            # Check programs table
            cursor.execute("SELECT COUNT(*) FROM programs")
            count = cursor.fetchone()[0]
            print(f"Programs table count: {count}\n")
            
            if count > 0:
                cursor.execute("SELECT programs_id, title, parent_id, program_id FROM programs LIMIT 10")
                print("Programs in table:")
                for row in cursor.fetchall():
                    print(f"  - ID: {row[0]}, Title: {row[1]}, Parent: {row[2]}, Program ID: {row[3]}")

if __name__ == "__main__":
    check_programs_table()
