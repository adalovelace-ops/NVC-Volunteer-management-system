"""
One-time migration: fix project-proposal-* projects that have latitude=0, longitude=0.
Sets them to null so the frontend coordinate inference chain can resolve them from
the address string (e.g. "Bacolod City" → known Negros Occidental coordinates).
"""
import sys
import json

try:
    from db import get_connection, load_environment
    from relational_mirror import get_relational_collection, upsert_relational_item
except ImportError:
    from .db import get_connection, load_environment
    from .relational_mirror import get_relational_collection, upsert_relational_item


def migrate():
    load_environment()
    print("Migrating project-proposal-* projects with (0,0) coordinates...")

    with get_connection() as conn:
        projects = get_relational_collection(conn, "projects")
        fixed = 0
        skipped = 0

        for project in projects:
            pid = str(project.get("id") or "")
            if not pid.startswith("project-proposal-"):
                continue

            loc = project.get("location") or {}
            lat = loc.get("latitude")
            lng = loc.get("longitude")

            # Only fix projects that have exactly (0, 0)
            if lat != 0 or lng != 0:
                skipped += 1
                continue

            address = str(loc.get("address") or "").strip()
            print(f"  Fixing: {pid[:40]} | address: '{address[:60]}'")

            updated_project = {
                **project,
                "location": {
                    **loc,
                    "latitude": None,
                    "longitude": None,
                    "address": address or "Location to be finalized",
                },
            }
            upsert_relational_item(conn, "projects", updated_project)
            fixed += 1

        conn.commit()
        print(f"\n✓ Fixed {fixed} projects, skipped {skipped} (already had coords)")


if __name__ == "__main__":
    migrate()
