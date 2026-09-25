# 3.7 Data Dictionary
Data Dictionary furnishes detailed information about the business data, like standard definitions of data elements, their meaning, and allowable values.

### Table 1: Users (users)
Stores authentication credentials, user profiles, system roles, and account onboarding states.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| users_id | Text | Text | 36 | Unique identifier of user account | user-admin-1780189738 |
| email | Text | Email | 64 | Registered login email address | admin@nvc.org |
| password | Text | Hash/Password | 64 | Encrypted or hashed authentication password | admin123 |
| role | Text | Text | 20 | System authorization role (admin, partner, volunteer) | admin |
| name | Text | Text | 50 | Full legal or display name of user | NVC Admin Account |
| phone | Text | Phone | 15 | Primary mobile contact number | 09170000001 |
| user_type | Text | Text | 20 | Volunteer demographic classification (Youth, Adult) | Adult |
| created_at | Text | Date/Time | 24 | ISO 8601 timestamp of account creation | 2026-09-19 10:30:00 |
| pillars_of_interest | ARRAY | List | - | Array of community advocacy pillars selected by user | {"Education","Livelihood","Nutrition"} |
| approval_status | Text | Text | 20 | Account validation status (Pending, Approved, Rejected) | Approved |
| approved_by | Text | Text | 36 | Identifier of administrator who approved account | user-admin-1780189738 |
| approved_at | Text | Date/Time | 24 | ISO timestamp of administrator approval | 2026-09-19 11:00:00 |
| rejection_reason | Text | Text | 100 | Explanation provided if registration was declined | Incomplete identity verification |
| volunteer_membership_sheet | Text | URL | 100 | Link or path to uploaded volunteer membership file | https://supabase.co/storage/v1/sheet.pdf |
| partner_application | Text | URL | 100 | Link or path to partner organization onboarding application | https://supabase.co/storage/v1/application.pdf |

### Table 2: Volunteers (volunteers)
Detailed volunteer demographics, service hours, skill assessments, and onboarding documents.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| volunteers_id | Text | Text | 36 | Unique identifier of volunteer record | VOL-001 |
| user_id | Text | Text | 36 | Foreign key reference to associated user account | user-vol-90210 |
| name | Text | Text | 50 | Full name of volunteer | Juan Dela Cruz |
| email | Text | Email | 64 | Volunteer primary email address | juan.delacruz@gmail.com |
| phone | Text | Phone | 15 | Volunteer contact number | 09181234567 |
| skills_description | Text | Text | 100 | Summary of personal competencies and capabilities | First aid certified, event coordination, teaching |
| availability | Text | Text | 30 | Availability schedule (Weekends, Weekdays, Full-time) | Weekends |
| total_hours_contributed | Double | Number | 10,2 | Cumulative volunteer hours rendered | 24.50 |
| rating | Double | Number | 3,2 | Evaluation performance rating score (1.00 - 5.00) | 4.85 |
| engagement_status | Text | Text | 20 | Current engagement state (Active, Inactive, On-Leave) | Active |
| background | Text | Text | 100 | Educational and professional background summary | BS Education graduate with 3 years youth teaching |
| gender | Text | Text | 15 | Gender identity of volunteer | Male |
| date_of_birth | Text | Date | 10 | Date of birth of volunteer (YYYY-MM-DD) | 2001-05-14 |
| civil_status | Text | Text | 20 | Civil marital status (Single, Married, etc.) | Single |
| home_address | Text | Text | 100 | Complete residential street address | Purok Pag-asa, Zone 4 |
| home_address_region | Text | Text | 30 | Administrative home region | Region VI |
| home_address_city_municipality | Text | Text | 40 | Home city or municipality | Talisay City |
| home_address_barangay | Text | Text | 40 | Home neighborhood / barangay | Barangay Dos |
| occupation | Text | Text | 40 | Current employment occupation | Elementary Teacher |
| workplace_or_school | Text | Text | 60 | Current employer company or academic institution | Talisay Elementary School |
| college_course | Text | Text | 50 | Tertiary degree program completed or attended | Bachelor of Elementary Education |
| certifications_or_trainings | Text | Text | 100 | Specialized certifications held | Red Cross First Aid & BLS Certification |
| hobbies_and_interests | Text | Text | 80 | Interests and extracurricular activities | Community teaching, sports, digital media |
| special_skills | Text | Text | 80 | Special technical or artistic competencies | Sign language, photography, basic graphic design |
| video_briefing_url | Text | URL | 100 | Link to recorded volunteer video briefing or interview | https://supabase.co/storage/v1/briefing.mp4 |
| affiliations | Text | Text | 60 | Affiliated community or school organizations | Talisay Youth Volunteer League |
| registration_status | Text | Text | 20 | Onboarding review state (Pending, Verified, Rejected) | Verified |
| reviewed_by | Text | Text | 36 | Identifier of staff member who vetted application | user-admin-1780189738 |
| reviewed_at | Text | Date/Time | 24 | ISO timestamp of staff review completion | 2026-09-19 11:30:00 |
| credentials_unlocked_at | Text | Date/Time | 24 | ISO timestamp when platform credentials unlocked | 2026-09-19 11:35:00 |
| created_at | Text | Date/Time | 24 | ISO timestamp when volunteer record was created | 2026-09-19 10:30:00 |
| skills | ARRAY | List | - | Array of indexed skill tag names | {"First Aid","Teaching","Event Facilitation"} |
| past_projects | ARRAY | List | - | Array of past completed project identifiers | {"PRJ-001","PRJ-004"} |
| valid_id_photo | Text | URL | 100 | Storage URL of submitted government identification card | https://supabase.co/storage/v1/valid_id.jpg |

### Table 3: Partners (partners)
Information regarding partner non-profits, organizations, and corporate community stakeholders.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| partners_id | Text | Text | 36 | Unique identifier of partner organization | PTR-001 |
| owner_user_id | Text | Text | 36 | Foreign key to primary representative user account | user-partner-001 |
| name | Text | Text | 60 | Official organization registered name | Hope Community Foundation |
| description | Text | Text | 120 | Mission overview and organizational background | Community NGO supporting childhood nutrition and literacy |
| category | Text | Text | 30 | Primary advocacy category (Nutrition, Education, etc.) | Nutrition |
| sector_type | Text | Text | 30 | Entity sector type (NGO, Corporate, LGU, Academic) | Non-Government Organization |
| dswd_accreditation_no | Text | Text | 30 | Official DSWD accreditation license number | DSWD-R6-2026-0042 |
| sec_registration_no | Text | Text | 30 | Securities and Exchange Commission certificate number | SEC-CN2024-11892 |
| contact_email | Text | Email | 64 | Official organizational inquiry email address | contact@hopefoundation.org |
| contact_phone | Text | Phone | 15 | Headquarters telephone or mobile number | 09198765432 |
| address | Text | Text | 100 | Physical headquarters office street address | 12 Mabini Street, Talisay City |
| status | Text | Text | 20 | Organizational status (Active, Inactive, Suspended) | Active |
| verification_status | Text | Text | 20 | Accreditation verification state (Verified, Pending) | Verified |
| verification_notes | Text | Text | 100 | Internal compliance evaluation remarks | DSWD certificate verified valid through Dec 2027 |
| validated_by | Text | Text | 36 | Identifier of compliance admin evaluator | user-admin-1780189738 |
| validated_at | Text | Date/Time | 24 | ISO timestamp of accreditation validation | 2026-09-19 10:45:00 |
| credentials_unlocked_at | Text | Date/Time | 24 | ISO timestamp when partner portal access granted | 2026-09-19 10:50:00 |
| created_at | Text | Date/Time | 24 | Date and time partner profile created | 2026-09-19 10:30:00 |
| registration_documents | JSONB | JSON | - | Serialized list of uploaded compliance legal documents | [{"type":"SEC","url":"https://.../sec.pdf"}] |
| advocacy_focus | ARRAY | List | - | Array of primary community advocacy pillars | {"Nutrition","Education"} |

### Table 4: Programs (programs)
Core advocacy pillars and umbrellas containing nested tracks, projects, and thematic initiatives.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| id | Text | Text | 36 | Unique identifier of overarching program | Nutrition |
| created_at | Text | Date/Time | 24 | Date and time program created | 2026-09-19 10:30:00 |
| title | Text | Text | 50 | Title of advocacy program | Nutrition |
| description | Text | Text | 120 | Detailed purpose and objectives of program | Food security and health programs for children and families. |
| partner_id | Text | Text | 36 | Identifier of sponsoring partner organization | PTR-001 |
| image_url | Text | URL | 100 | Banner cover graphic URL | https://supabase.co/storage/v1/nutrition.jpg |
| image_hidden | Boolean | Boolean | 1 | Visibility toggle for program banner image | false |
| program_module | Text | Text | 30 | System advocacy module (Nutrition, Education, etc.) | Nutrition |
| status_mode | Text | Text | 20 | Status calculation mode (Auto, Manual) | Auto |
| manual_status | Text | Text | 20 | Override status when mode set to manual | Active |
| status | Text | Text | 20 | Operational state (Planning, Active, Completed) | Active |
| category | Text | Text | 30 | Focus area category | Nutrition |
| start_date | Text | Date/Time | 24 | Program launch date | 2026-09-19 10:30:00 |
| end_date | Text | Date/Time | 24 | Program scheduled conclusion date | 2026-12-31 18:00:00 |
| location | Text | Text | 80 | Operating jurisdiction venue or region | Negros Occidental |
| volunteers_needed | Integer | Number | 11 | Total volunteer staffing quota across program | 50 |
| volunteers | ARRAY | List | - | Array of assigned volunteer identifiers | {"VOL-001","VOL-002"} |
| joined_user_ids | ARRAY | List | - | Array of user IDs who joined program initiatives | {"user-vol-90210"} |
| linked_event_count | Integer | Number | 11 | Count of sub-events and activities associated | 4 |
| updated_at | Text | Date/Time | 24 | Date and time program details updated | 2026-09-19 10:30:00 |
| icon | Text | Text | 30 | MaterialIcons vector icon identifier | restaurant |
| color | Text | Hex Code | 7 | Accent color code associated with program pillar | #dc2626 |
| program_id | Text | Text | 36 | Self-referencing root program code | Nutrition |
| tracks | JSONB | JSON | - | JSON array of nested program track definitions | [{"id":"feed-100","title":"Feeding Campaign","color":"#dc2626"}] |

### Table 5: Projects (projects)
Community service projects, operational volunteer engagements, and outreach drives.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| id | Text | Text | 36 | Unique identifier of community project | PRJ-001 |
| created_at | Text | Date/Time | 24 | Date and time project was created | 2026-09-19 10:30:00 |
| title | Text | Text | 60 | Descriptive name of volunteer project | Mingo Meal Feeding Drive |
| description | Text | Text | 120 | Scope, beneficiary target, and activity summary | Nutritional feeding program for 100 malnourished children |
| partner_id | Text | Text | 36 | Foreign key to organizer partner organization | PTR-001 |
| program_module | Text | Text | 30 | Parent program module association | Nutrition |
| is_event | Boolean | Boolean | 1 | Distinguishes one-day event from sustained project | false |
| parent_project_id | Text | Text | 36 | Identifier of master parent initiative if sub-project | Nutrition |
| image_url | Text | URL | 100 | Project promotional cover image URL | https://supabase.co/storage/v1/feeding.jpg |
| image_hidden | Boolean | Boolean | 1 | Flag to suppress display of header graphic | false |
| status_mode | Text | Text | 20 | Automatic or manual lifecycle progress mode | Auto |
| manual_status | Text | Text | 20 | Manual lifecycle override value | Active |
| status | Text | Text | 20 | Project lifecycle status (Planning, Active, Completed) | Active |
| category | Text | Text | 30 | Advocacy category focus | Nutrition |
| start_date | Text | Date/Time | 24 | Scheduled project kickoff timestamp | 2026-09-20 08:00:00 |
| end_date | Text | Date/Time | 24 | Scheduled project target completion timestamp | 2026-09-20 17:00:00 |
| location | Text | Text | 80 | Complete project venue or target community | Gymnasium, Talisay City |
| volunteers_needed | Integer | Number | 11 | Target number of volunteer participants requested | 20 |
| volunteers | ARRAY | List | - | Array of registered volunteer identifiers | {"VOL-001","VOL-002"} |
| joined_user_ids | ARRAY | List | - | Array of platform user account IDs enlisted | {"user-vol-90210"} |
| internal_tasks | JSONB | JSON | - | Serialized nested project milestone task checklist | [{"id":"TSK-01","title":"Prep meals","completed":true}] |
| skills_needed | ARRAY | List | - | Array of required volunteer skills tags | {"Food Preparation","Crowd Management"} |
| updated_at | Text | Date/Time | 24 | Timestamp of last record modification | 2026-09-19 12:00:00 |
| program_id | Text | Text | 36 | Identifier of linked parent program | Nutrition |
| location_region | Text | Text | 30 | Philippine administrative region | Region VI |
| location_city | Text | Text | 40 | Host city or municipality | Talisay City |
| location_barangay | Text | Text | 40 | Host local barangay community | Barangay Zone 2 |
| volunteer_requirements | Text | Text | 100 | Special prerequisites, dress code, or conditions | Comfortable clothes, health mask, valid ID |
| attachment_url | Text | URL | 100 | Project brief PDF or documentation attachment link | https://supabase.co/storage/v1/project_brief.pdf |
| documents | JSONB | JSON | - | Serialized list of uploaded compliance or briefing documents | [{"name":"Risk Assessment","url":"https://..."}] |

### Table 6: Tasks (tasks)
Specific actionable work items, operational duties, and field assignments.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| tasks_id | Text | Text | 36 | Unique identifier of assigned task | TSK-001 |
| title | Text | Text | 60 | Task headline or duty description | Distribute Food Packs |
| description | Text | Text | 100 | Step-by-step instructions for assigned volunteer | Hand out 100 nutritional food packs to verified beneficiaries |
| category | Text | Text | 30 | Task category | Logistics |
| priority | Text | Text | 20 | Urgency priority level (Low, Medium, High) | High |
| status | Text | Text | 20 | Current task progress (Pending, In Progress, Completed) | In Progress |
| assigned_volunteer_id | Text | Text | 36 | Identifier of designated volunteer assignee | VOL-001 |
| assigned_volunteer_name | Text | Text | 50 | Display name of assigned volunteer | Juan Dela Cruz |
| is_field_officer | Boolean | Boolean | 1 | Denotes leadership responsibility for activity area | false |
| skills_needed | ARRAY | List | - | Array of required skill capabilities | {"Crowd Management","Logistics"} |
| created_at | Text | Date/Time | 24 | ISO timestamp task was logged | 2026-09-19 10:30:00 |
| updated_at | Text | Date/Time | 24 | ISO timestamp of last task update | 2026-09-19 11:15:00 |

### Table 7: Events (events)
Time-bound volunteer activities, community orientations, feeding days, and assemblies.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| id | Text | Text | 36 | Unique identifier of scheduled event | EVT-001 |
| title | Text | Text | 60 | Official title of event activity | Community Feeding Assembly |
| description | Text | Text | 120 | Detailed agenda and scope of event | Volunteer mobilization for Saturday feeding and health check |
| partner_id | Text | Text | 36 | Host partner organization ID | PTR-001 |
| program_module | Text | Text | 30 | Parent program pillar module | Nutrition |
| is_event | Boolean | Boolean | 1 | Distinguishes discrete event record | true |
| parent_project_id | Text | Text | 36 | Associated project identifier | PRJ-001 |
| status | Text | Text | 20 | Event status (Upcoming, Ongoing, Completed, Cancelled) | Upcoming |
| category | Text | Text | 30 | Activity focus classification | Nutrition |
| start_date | Text | Date/Time | 24 | Event start date and time | 2026-09-20 08:30:00 |
| end_date | Text | Date/Time | 24 | Event finish date and time | 2026-09-20 12:00:00 |
| location | Text | Text | 80 | Physical event venue or virtual link | Barangay Dos Community Center, Talisay City |
| volunteers_needed | Integer | Number | 11 | Target number of volunteer staff needed | 15 |
| internal_tasks | JSONB | JSON | - | Serialized list of sub-tasks for event execution | [{"title":"Registration Desk","done":false}] |
| created_at | Text | Date/Time | 24 | Date and time event created | 2026-09-19 10:30:00 |
| updated_at | Text | Date/Time | 24 | Date and time event updated | 2026-09-19 10:30:00 |
| image_url | Text | URL | 100 | Event cover graphic URL | https://supabase.co/storage/v1/event_cover.jpg |
| image_hidden | Boolean | Boolean | 1 | Visibility toggle for event banner | false |
| volunteers | ARRAY | List | - | Array of volunteer IDs participating in event | {"VOL-001","VOL-002"} |
| joined_user_ids | ARRAY | List | - | Array of confirmed attendee user account IDs | {"user-vol-90210"} |
| skills_needed | ARRAY | List | - | Array of required event competencies | {"Food Preparation","Crowd Management"} |
| status_mode | Text | Text | 20 | Lifecycle mode (Auto or Manual) | Auto |
| manual_status | Text | Text | 20 | Manual lifecycle override value | Upcoming |
| program_id | Text | Text | 36 | Associated program pillar | Nutrition |
| location_region | Text | Text | 30 | Region of event venue | Region VI |
| location_city | Text | Text | 40 | City or municipality of event venue | Talisay City |
| location_barangay | Text | Text | 40 | Barangay of event venue | Barangay Dos |
| volunteer_requirements | Text | Text | 100 | Required attire, equipment, or briefings | Comfortable footwear, volunteer ID badge |

### Table 8: Skills (skills)
Master lookup catalog of volunteer competencies, certifications, and technical capabilities.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| skills_id | Text | Text | 36 | Unique identifier or slug of standardized skill | First Aid |
| created_at | Text | Date/Time | 24 | ISO timestamp of skill catalog entry creation | 2026-09-19 10:30:00 |
| name | Text | Text | 50 | Display name of skill or certification | First Aid |
| updated_at | Text | Date/Time | 24 | ISO timestamp of last catalog modification | 2026-09-19 10:30:00 |

### Table 9: Partner Project Applications (partner_project_applications)
Project proposals and collaboration applications submitted by partner entities.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| partner_project_applications_id | Text | Text | 36 | Unique identifier of partner proposal record | PPA-001 |
| project_id | Text | Text | 36 | Identifier of target project or program track | PRJ-001 |
| partner_user_id | Text | Text | 36 | Foreign key of applicant partner representative | user-partner-001 |
| partner_name | Text | Text | 60 | Name of applying partner organization | Hope Community Foundation |
| partner_email | Text | Email | 64 | Contact email of partner applicant | contact@hopefoundation.org |
| status | Text | Text | 20 | Proposal status (Submitted, Approved, Rejected) | Approved |
| requested_at | Text | Date/Time | 24 | ISO timestamp proposal was submitted | 2026-09-19 10:30:00 |
| reviewed_at | Text | Date/Time | 24 | ISO timestamp administrator reviewed proposal | 2026-09-19 11:30:00 |
| reviewed_by | Text | Text | 36 | Identifier of approving administrator | user-admin-1780189738 |
| proposal_details | JSONB | JSON | - | Serialized proposal scope, budget, and volunteer specs | {"beneficiaryCount":100,"targetDate":"2026-09-20"} |

### Table 10: Volunteer Event Joins (volunteer_event_joins)
Tracks volunteer enlistment, participation status, and sign-ups for projects and events.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| volunteer_event_joins_id | Text | Text | 36 | Unique identifier of join registration record | VEJ-001 |
| project_id | Text | Text | 36 | Identifier of enlisting project or event | PRJ-001 |
| volunteer_id | Text | Text | 36 | Identifier of joining volunteer | VOL-001 |
| volunteer_user_id | Text | Text | 36 | User account identifier of volunteer | user-vol-90210 |
| volunteer_name | Text | Text | 50 | Full name of volunteer registrant | Juan Dela Cruz |
| volunteer_email | Text | Email | 64 | Contact email address of volunteer | juan.delacruz@gmail.com |
| joined_at | Text | Date/Time | 24 | ISO timestamp registration was confirmed | 2026-09-19 10:30:00 |
| source | Text | Text | 20 | Enlistment channel (Direct, Invitation, Admin) | Direct |
| participation_status | Text | Text | 20 | Attendance state (Confirmed, Completed, Withdrawn) | Confirmed |
| completed_at | Text | Date/Time | 24 | ISO timestamp participation verified complete | 2026-09-20 17:00:00 |
| completed_by | Text | Text | 36 | Identifier of coordinator validating completion | user-partner-001 |

### Table 11: Volunteer Time Logs (volunteer_time_logs)
Audit trail of volunteer check-in, check-out, service hours, and on-site attendance photo proofs.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| volunteer_time_logs_id | Text | Text | 36 | Unique identifier of time tracking record | VTL-001 |
| volunteer_id | Text | Text | 36 | Identifier of participating volunteer | VOL-001 |
| project_id | Text | Text | 36 | Associated project or event identifier | PRJ-001 |
| time_in | Text | Date/Time | 24 | ISO timestamp of volunteer check-in | 2026-09-20 08:00:00 |
| time_out | Text | Date/Time | 24 | ISO timestamp of volunteer check-out | 2026-09-20 16:30:00 |
| note | Text | Text | 100 | Field notes, duties completed, or coordinator observations | Assisted in breakfast distribution and clean-up |
| completion_photo | Text | URL | 100 | URL of completed field duty photographic proof | https://supabase.co/storage/v1/work_done.jpg |
| completion_report | Text | Text | 100 | Self-reported volunteer post-activity summary | Successfully assisted 100 children with feeding packs |
| attendance_photo | Text | URL | 100 | Storage URL of check-in selfie or QR scan verification | https://supabase.co/storage/v1/attendance.jpg |
| attendance_confirmed_at | Text | Date/Time | 24 | ISO timestamp of supervisor attendance confirmation | 2026-09-20 08:05:00 |
| attendance_checked_at | Text | Date/Time | 24 | ISO timestamp of digital attendance check | 2026-09-20 08:00:00 |
| attendance_checked_by | Text | Text | 36 | User ID of field officer confirming attendance | user-partner-001 |
| attendance_checked_by_name | Text | Text | 50 | Name of field officer verifying attendance | Maria Santos |

### Table 12: Status Updates (status_updates)
Real-time project milestone timeline entries, announcements, and progress logs.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| status_updates_id | Text | Text | 36 | Unique identifier of status progress log | SU-001 |
| project_id | Text | Text | 36 | Identifier of referenced project or event | PRJ-001 |
| status | Text | Text | 20 | Current milestone lifecycle status | In Progress |
| description | Text | Text | 120 | Detailed update announcement text | Feeding supplies arrived at Talisay venue. Setup underway. |
| updated_by | Text | Text | 50 | Author name or user identifier of poster | Maria Santos (Project Lead) |
| updated_at | Text | Date/Time | 24 | ISO timestamp update was posted | 2026-09-20 07:45:00 |
| source | Text | Text | 20 | Origin of update (System, Partner, Admin) | Partner |

### Table 13: Reports (reports)
Formal accomplishment reports, project assessments, and published impact records (without metrics or impact_count).

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| reports_id | Text | Text | 36 | Unique identifier of submitted accomplishment report | RPT-001 |
| project_id | Text | Text | 36 | Identifier of reported project or event | PRJ-001 |
| partner_id | Text | Text | 36 | Identifier of reporting partner organization | PTR-001 |
| partner_user_id | Text | Text | 36 | User account identifier of partner representative | user-partner-001 |
| partner_name | Text | Text | 60 | Name of reporting organization | Hope Community Foundation |
| submitter_user_id | Text | Text | 36 | User ID of individual submitting report | user-partner-001 |
| submitter_name | Text | Text | 50 | Name of person preparing report | Maria Santos |
| submitter_role | Text | Text | 20 | Organizational role of submitter | Partner Admin |
| title | Text | Text | 60 | Formal title of accomplishment report | Mingo Meal Feeding Drive Accomplishment Report |
| report_type | Text | Text | 30 | Classification (Accomplishment, Terminal, Incident) | Accomplishment |
| description | Text | Text | 120 | Executive summary of completed activities and outcomes | Successful meal distribution achieved for 100 children in Talisay. |
| attachments | JSONB | JSON | - | Serialized list of supporting receipts and documentation | [{"name":"Attendance Sheet","url":"https://..."}] |
| media_file | Text | URL | 100 | Primary highlight photograph or media showcase URL | https://supabase.co/storage/v1/feeding_highlight.jpg |
| created_at | Text | Date/Time | 24 | Date and time report was logged | 2026-09-20 18:00:00 |
| status | Text | Text | 20 | Review status (Draft, Submitted, Approved, Published) | Approved |
| reviewed_at | Text | Date/Time | 24 | ISO timestamp administrator reviewed report | 2026-09-21 09:00:00 |
| reviewed_by | Text | Text | 36 | Identifier of administrator reviewing submission | user-admin-1780189738 |
| generated_by | Text | Text | 36 | Identifier of user generating final summary artifact | user-admin-1780189738 |
| generated_at | Text | Date/Time | 24 | ISO timestamp of report compilation | 2026-09-21 09:15:00 |
| report_file | Text | URL | 100 | Storage URL of compiled PDF export document | https://supabase.co/storage/v1/reports/RPT-001.pdf |
| format | Text | Text | 10 | Document format type (PDF, DOCX) | PDF |
| published_at | Text | Date/Time | 24 | ISO timestamp when report made public to community | 2026-09-21 10:00:00 |
| download_content | Text | Text | - | Cached raw text or base64 data for offline generation | NVC Community Feeding Report Content... |
| download_mime_type | Text | Text | 30 | Standard MIME type for file download | application/pdf |
| source_report_ids | ARRAY | List | - | Array of underlying partner report IDs if aggregated | {"RPT-001"} |

### Table 14: Direct Messages (messages)
Direct private messages and 1-on-1 inquiries between administrators, volunteers, and partners.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| id | Text | Text | 36 | Unique identifier of direct message | MSG-001 |
| sender_id | Text | Text | 36 | User account identifier of sender | user-admin-1780189738 |
| recipient_id | Text | Text | 36 | User account identifier of recipient | user-vol-90210 |
| project_id | Text | Text | 36 | Optional project context reference | PRJ-001 |
| content | Text | Text | 150 | Text body of direct message | Hello Juan, please remember to bring your volunteer ID tomorrow. |
| timestamp | Timestamp | Date/Time | 24 | Timestamp of message dispatch | 2026-09-19 14:30:00+00 |
| read | Boolean | Boolean | 1 | Read receipt indicator | true |
| attachments | JSONB | JSON | - | Serialized array of file attachments | [] |
| deleted | Boolean | Boolean | 1 | Soft-delete marker flag | false |
| edited | Boolean | Boolean | 1 | Message edit marker flag | false |
| reply_to_id | Text | Text | 36 | Message ID of quoted parent message in thread | MSG-000 |
| reply_to_content | Text | Text | 100 | Quoted snippet text of parent message | What should I bring? |
| reply_to_sender_name | Text | Text | 50 | Author name of quoted parent message | Juan Dela Cruz |

### Table 15: Project Group Messages (project_group_messages)
Shared group communication chat, team discussions, and collaboration messages for projects.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| id | Text | Text | 36 | Unique identifier of project group message | PGM-001 |
| project_id | Text | Text | 36 | Identifier of associated project team workspace | PRJ-001 |
| sender_id | Text | Text | 36 | User account identifier of message author | user-partner-001 |
| content | Text | Text | 150 | Chat message content or proposal notification | Team, please report to Station 1 for briefing. |
| timestamp | Timestamp | Date/Time | 24 | Timestamp of group message posting | 2026-09-20 07:30:00+00 |
| kind | Text | Text | 20 | Message type (text, system, proposal, need_post) | text |
| need_post | JSONB | JSON | - | Serialized interactive volunteer request card | {"skills":["Cooking"],"needed":3} |
| scope_proposal | JSONB | JSON | - | Serialized project scope revision card | {"proposedEndDate":"2026-09-21"} |
| response_to_message_id | Text | Text | 36 | Reference ID of message being answered | PGM-000 |
| response_action | Text | Text | 20 | Interactive action taken (Accept, Decline) | Accept |
| response_to_title | Text | Text | 50 | Title of associated interactive card | Station Assignment |
| attachments | JSONB | JSON | - | Serialized array of file attachment objects | [] |
| deleted | Boolean | Boolean | 1 | Soft-delete marker flag | false |
| edited | Boolean | Boolean | 1 | Message edit marker flag | false |
| reply_to_id | Text | Text | 36 | Referenced message ID for in-thread reply | PGM-000 |
| reply_to_content | Text | Text | 100 | Quoted text snippet of parent reply | Where do we assemble? |
| reply_to_sender_name | Text | Text | 50 | Sender name of parent message | Juan Dela Cruz |

### Table 16: Event Group Messages (event_group_messages)
Interactive group messaging and real-time coordination channels dedicated to events.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| id | Text | Text | 36 | Unique identifier of event chat entry | EGM-001 |
| event_id | Text | Text | 36 | Identifier of designated event channel | EVT-001 |
| sender_id | Text | Text | 36 | User account identifier of posting participant | user-admin-1780189738 |
| content | Text | Text | 150 | Content of announcement or group broadcast | Welcome volunteers! Please check in at the reception table. |
| timestamp | Timestamp | Date/Time | 24 | Timestamp of message dispatch | 2026-09-20 08:15:00+00 |
| kind | Text | Text | 20 | Classification of message entry | text |
| need_post | JSONB | JSON | - | Serialized urgent event role request card | {"role":"First Aider","slots":2} |
| scope_proposal | JSONB | JSON | - | Serialized emergency schedule adjustment card | {"rescheduledTime":"09:00"} |
| response_to_message_id | Text | Text | 36 | Referenced message identifier | EGM-000 |
| response_action | Text | Text | 20 | Action response status | Acknowledged |
| response_to_title | Text | Text | 50 | Title of interactive prompt | Assembly Notice |
| attachments | JSONB | JSON | - | Serialized attachment links or image proofs | [] |
| deleted | Boolean | Boolean | 1 | Message deletion toggle indicator | false |
| edited | Boolean | Boolean | 1 | Message modification toggle indicator | false |
| reply_to_id | Text | Text | 36 | Quoted message ID in thread | EGM-000 |
| reply_to_content | Text | Text | 100 | Quoted snippet text | Are parking spaces available? |
| reply_to_sender_name | Text | Text | 50 | Sender name of parent message | Juan Dela Cruz |

### Table 17: DSWD Accreditation Numbers (dswd_accreditation_numbers)
Pre-approved DSWD accreditation license inventory used to validate partner non-profits.

| Field Name | Data Type | Data Format | Field Size | Description | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| dswd_accreditation_numbers_id | Text | Text | 36 | Unique identifier of accreditation registry record | DSWD-001 |
| accreditation_no | Text | Text | 30 | Standardized DSWD accreditation license number | DSWD-R6-2026-0042 |
| is_assigned | Boolean | Boolean | 1 | Indicates if accreditation number is currently assigned to partner | true |
| assigned_to_partner_id | Text | Text | 36 | Partner identifier holding this accreditation | PTR-001 |
| assigned_at | Text | Date/Time | 24 | ISO timestamp of accreditation license assignment | 2026-09-19 10:45:00 |
| created_at | Text | Date/Time | 24 | ISO timestamp record entered into database pool | 2026-09-19 10:30:00 |
| updated_at | Text | Date/Time | 24 | ISO timestamp of last registry status change | 2026-09-19 10:45:00 |
