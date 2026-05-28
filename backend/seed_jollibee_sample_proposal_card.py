"""Seed one pending Jollibee nutrition proposal card for Communication Hub review testing."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from backend.db import get_postgres_connection
from backend.relational_mirror import ensure_relational_mirror_tables

ADMIN_USER_ID = "admin-1"
JOLLIBEE_USER_ID = "partner-user-3"
APPLICATION_ID = "partner-application-sample-jollibee-nutrition-card"
MESSAGE_ID = "msg-sample-jollibee-proposal-card"
PROPOSAL_PREFIX = "___PROPOSAL_CARD___:"


def main() -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    proposal_details = {
        "targetProjectId": None,
        "targetProjectTitle": "Jollibee Nutrition Project",
        "targetProjectDescription": "A community nutrition and feeding project led by Jollibee Foundation.",
        "targetProjectAddress": "Talisay City, Negros Occidental",
        "requestedProgramModule": "Nutrition",
        "proposedTitle": "Jollibee Nutrition Support Initiative",
        "proposedDescription": (
            "Jollibee Foundation proposes a nutrition support initiative for children and families in barangay outreach. "
            "The project includes feeding sessions, nutrition education workshops, and volunteer monitoring."
        ),
        "proposedStartDate": "2026-06-20",
        "proposedEndDate": "2026-07-20",
        "proposedLocation": "Talisay City, Negros Occidental",
        "proposedVolunteersNeeded": 24,
        "skillsNeeded": ["nutrition education", "event coordination", "community outreach"],
        "communityNeed": (
            "Local barangays need supplemental feeding support and nutrition coaching for children at risk of undernutrition."
        ),
        "expectedDeliverables": (
            "Five nutrition workshops, weekly feeding sessions, volunteer-led monitoring reports, "
            "and a final summary with beneficiary photos."
        ),
        "attachments": [],
    }
    application = {
        "id": APPLICATION_ID,
        "projectId": "program:Nutrition::sample-jollibee-card",
        "partnerUserId": JOLLIBEE_USER_ID,
        "partnerName": "Jollibee Foundation Account",
        "partnerEmail": "partnerships@jollibeefoundation.org",
        "proposalDetails": proposal_details,
        "status": "Pending",
        "requestedAt": now_iso,
        "reviewedAt": None,
        "reviewedBy": None,
        "reviewNotes": None,
    }
    card_payload = {
        **proposal_details,
        "status": "Pending",
        "proposedById": JOLLIBEE_USER_ID,
        "proposedByName": "Jollibee Foundation Account",
        "applicationId": APPLICATION_ID,
        "timestamp": now_iso,
    }

    with get_postgres_connection() as connection:
        ensure_relational_mirror_tables(connection)
        connection.rollback()

        with connection.cursor() as cursor:
            cursor.execute(
                "alter table public.partner_project_applications add column if not exists review_notes text"
            )
            cursor.execute(
                """
                insert into public.partner_project_applications (
                  id, project_id, partner_user_id, partner_name, partner_email,
                  proposal_details, status, requested_at, reviewed_at, reviewed_by, review_notes
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (id) do update set
                  project_id = excluded.project_id,
                  partner_user_id = excluded.partner_user_id,
                  partner_name = excluded.partner_name,
                  partner_email = excluded.partner_email,
                  proposal_details = excluded.proposal_details,
                  status = excluded.status,
                  requested_at = excluded.requested_at,
                  reviewed_at = excluded.reviewed_at,
                  reviewed_by = excluded.reviewed_by,
                  review_notes = excluded.review_notes
                """,
                (
                    application["id"],
                    application["projectId"],
                    application["partnerUserId"],
                    application["partnerName"],
                    application["partnerEmail"],
                    json.dumps(application["proposalDetails"]),
                    application["status"],
                    application["requestedAt"],
                    application["reviewedAt"],
                    application["reviewedBy"],
                    application["reviewNotes"],
                ),
            )
            cursor.execute(
                """
                create table if not exists public.messages (
                  id text primary key,
                  sender_id text not null,
                  recipient_id text not null,
                  project_id text,
                  content text not null,
                  timestamp text not null,
                  read boolean not null default false,
                  attachments text not null default '[]'
                )
                """
            )
            cursor.execute(
                """
                insert into public.messages (
                  id, sender_id, recipient_id, project_id, content, timestamp, read, attachments
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (id) do update set
                  sender_id = excluded.sender_id,
                  recipient_id = excluded.recipient_id,
                  project_id = excluded.project_id,
                  content = excluded.content,
                  timestamp = excluded.timestamp,
                  read = excluded.read,
                  attachments = excluded.attachments
                """,
                (
                    MESSAGE_ID,
                    JOLLIBEE_USER_ID,
                    ADMIN_USER_ID,
                    None,
                    f"{PROPOSAL_PREFIX}{json.dumps(card_payload, separators=(',', ':'))}",
                    now_iso,
                    False,
                    json.dumps([]),
                ),
            )
        connection.commit()

    print(
        json.dumps(
            {
                "applicationId": APPLICATION_ID,
                "messageId": MESSAGE_ID,
                "sender": "Jollibee Foundation Account",
                "recipient": "NVC Admin Account",
                "status": "Pending",
                "title": proposal_details["proposedTitle"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
