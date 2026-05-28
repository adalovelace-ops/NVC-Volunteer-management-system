"""
Performance optimization: Verify and add any missing database indexes.
The relational mirror tables already have most indexes defined in their DDL.
This script adds any additional indexes that may be missing and runs ANALYZE.
"""
import sys

try:
    from db import get_connection, load_environment
except ImportError:
    from .db import get_connection, load_environment


def add_performance_indexes():
    """Verify existing indexes and add any missing ones, then run ANALYZE."""
    load_environment()

    # Additional indexes beyond what the DDL already creates
    # Format: (index_name, table_name, column_expr)
    extra_indexes = [
        # volunteer_time_logs: status column for filtering active/completed logs
        (
            "volunteer_time_logs_status_idx",
            "volunteer_time_logs",
            "(coalesce(status, ''))",
        ),
        # volunteer_event_joins: volunteer_user_id for fast user-based lookups
        (
            "volunteer_event_joins_volunteer_user_id_idx",
            "volunteer_event_joins",
            "(volunteer_user_id)",
        ),
        # projects: composite index for event listing (is_event + status)
        (
            "projects_is_event_status_idx",
            "projects",
            "(is_event, status)",
        ),
        # events: composite index for event listing (is_event + status)
        (
            "events_is_event_status_idx",
            "events",
            "(is_event, status)",
        ),
        # volunteer_matches: status for filtering pending/approved matches
        (
            "volunteer_matches_volunteer_status_idx",
            "volunteer_matches",
            "(volunteer_id, status)",
        ),
    ]

    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                print("Checking existing indexes...")

                # List all existing indexes
                cursor.execute(
                    """
                    SELECT indexname, tablename
                    FROM pg_indexes
                    WHERE schemaname = 'public'
                    ORDER BY tablename, indexname
                    """
                )
                existing = {row[0] for row in cursor.fetchall()}
                print(f"  Found {len(existing)} existing indexes")

                print("\nAdding missing performance indexes...")
                added = 0
                skipped = 0

                for index_name, table_name, column_expr in extra_indexes:
                    if index_name in existing:
                        print(f"  ✓ {index_name} already exists")
                        skipped += 1
                        continue

                    # Check table exists
                    cursor.execute(
                        """
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = %s
                        """,
                        (table_name,),
                    )
                    if not cursor.fetchone():
                        print(f"  ⚠ Table '{table_name}' not found, skipping {index_name}")
                        skipped += 1
                        continue

                    try:
                        sql = f"CREATE INDEX {index_name} ON {table_name} {column_expr}"
                        cursor.execute(sql)
                        connection.commit()
                        print(f"  + Created: {index_name}")
                        added += 1
                    except Exception as e:
                        connection.rollback()
                        print(f"  ✗ Failed {index_name}: {e}")

                print(f"\nSummary: {added} added, {skipped} skipped")

                print("\nRunning ANALYZE to update query planner statistics...")
                # Analyze the most important tables
                for table in [
                    "projects", "events", "volunteers", "volunteer_time_logs",
                    "volunteer_event_joins", "volunteer_matches",
                    "partner_project_applications", "status_updates",
                ]:
                    try:
                        cursor.execute(f"ANALYZE {table}")
                        connection.commit()
                        print(f"  ✓ ANALYZE {table}")
                    except Exception as e:
                        connection.rollback()
                        print(f"  ⚠ ANALYZE {table} skipped: {e}")

                print("\n✓ Performance index check complete!")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    add_performance_indexes()
