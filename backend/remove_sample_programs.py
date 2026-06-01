"""Remove sample demo programs from the database."""

from db import get_connection

SAMPLE_PROJECT_IDS = {
    "project-sample-nutrition-program",
    "project-sample-livelihood-program",
    "project-sample-education-program",
}

SAMPLE_EVENT_IDS = {
    "project-sample-nutrition-event-1",
    "project-sample-livelihood-event-1",
    "project-sample-education-event-1",
    "project-sample-education-event-2",
}


def remove_sample_programs():
    """Remove sample programs and events from hot storage."""
    connection = get_connection()
    
    try:
        with connection.cursor() as cursor:
            # Get current projects
            cursor.execute("SELECT value FROM app_storage WHERE key = %s", ("projects",))
            result = cursor.fetchone()
            
            if result and isinstance(result[0], list):
                projects = result[0]
                # Filter out sample projects
                filtered_projects = [
                    p for p in projects 
                    if isinstance(p, dict) and str(p.get("id", "")).strip() not in SAMPLE_PROJECT_IDS
                ]
                
                if len(filtered_projects) < len(projects):
                    # Update projects
                    cursor.execute(
                        "UPDATE app_storage SET value = %s WHERE key = %s",
                        (filtered_projects, "projects")
                    )
                    print(f"✓ Removed {len(projects) - len(filtered_projects)} sample projects")
            
            # Get current events
            cursor.execute("SELECT value FROM app_storage WHERE key = %s", ("events",))
            result = cursor.fetchone()
            
            if result and isinstance(result[0], list):
                events = result[0]
                # Filter out sample events
                filtered_events = [
                    e for e in events
                    if isinstance(e, dict) and str(e.get("id", "")).strip() not in SAMPLE_EVENT_IDS
                ]
                
                if len(filtered_events) < len(events):
                    # Update events
                    cursor.execute(
                        "UPDATE app_storage SET value = %s WHERE key = %s",
                        (filtered_events, "events")
                    )
                    print(f"✓ Removed {len(events) - len(filtered_events)} sample events")
        
        connection.commit()
        print("\n✓ Sample programs and events have been removed from the database.")
        print("✓ They will not reappear on next app initialization.")
        
    except Exception as e:
        connection.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    remove_sample_programs()
