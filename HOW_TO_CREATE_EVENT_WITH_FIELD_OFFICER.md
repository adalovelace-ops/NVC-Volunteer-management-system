# How to Create an Event with Field Officer Task

## Current Status

✅ **Project Created**: "DISASTER RISK PROTECTION TRAINING"
- ID: `project-1780217407655`
- Type: PROJECT (not an event)
- Tasks: 0 (projects don't get field officer tasks)

❌ **No Events Yet**: You need to create an EVENT under this project

## Why No Field Officer Task?

The field officer task is **ONLY created for EVENTS**, not for projects.

**Hierarchy**:
```
Program (DISASTER)
  └── Project (DISASTER RISK PROTECTION TRAINING) ← You created this
        └── Event (e.g., "Training Day 1") ← You need to create this
              └── Field Officer Task ← Will be auto-created here
```

## Step-by-Step: Create an Event

### 1. Open Your Project
1. Log in as admin (web)
2. Go to Projects/Programs section
3. Find "DISASTER RISK PROTECTION TRAINING"
4. Click to open it

### 2. Create an Event Under the Project
1. Look for "Create Event" or "Add Event" button
2. Click it to open the event creation form

### 3. Fill in Event Details
**Important**: Make sure you're creating an EVENT, not another project!

- **Title**: "Training Day 1" (or any name)
- **Is Event**: ✅ **MUST BE CHECKED** (this is critical!)
- **Parent Project**: Should auto-select "DISASTER RISK PROTECTION TRAINING"
- **Region**: Should be READ-ONLY (inherited from parent project)
- **City**: Should be READ-ONLY (inherited from parent project)
- **Barangay**: Select any barangay (this is the only location field you can edit)
- **Start Date**: Select event date
- **End Date**: Select event end date
- **Description**: Any description
- **Volunteers Needed**: Any number

### 4. Save the Event
Click "Save" or "Create Event"

### 5. Verify Field Officer Task
1. After saving, the event details should open
2. Scroll down to "Event Task Board" section
3. You should see:
   ```
   Task Assignments
   1 total task • 0 assigned
   ```
4. Click to expand
5. You should see:
   ```
   Field Officer                    HIGH
   Event Management
   
   Field officer responsible for on-site 
   event coordination and management
   
   Skills needed: Event Management, 
   Leadership, Communication
   
   Status: Unassigned
   ```

## Common Mistakes

### ❌ Mistake 1: Creating a Project Instead of Event
- **Problem**: "Is Event" checkbox is NOT checked
- **Result**: No field officer task (projects don't get them)
- **Solution**: Make sure "Is Event" is checked ✅

### ❌ Mistake 2: Creating Event at Top Level
- **Problem**: Creating event without a parent project
- **Result**: May not save properly
- **Solution**: Always create events UNDER a project

### ❌ Mistake 3: Not Seeing the Task
- **Problem**: Looking at project instead of event
- **Result**: Projects don't have "Event Task Board"
- **Solution**: Make sure you're viewing the EVENT, not the project

## Verification Script

To check if your event was created with field officer task:

```bash
cd backend
python check_all_projects.py
```

Expected output after creating event:
```
=== All Projects/Events in Database (2) ===

PROJECT: DISASTER RISK PROTECTION TRAINING
  ID: project-1780217407655
  Created: 2026-05-31T08:50:07.655Z
  Tasks: 0 total, 0 field officer

EVENT: Training Day 1
  ID: event-1780217500000
  Created: 2026-05-31T09:00:00.000Z
  Tasks: 1 total, 1 field officer
    - Field Officer [FIELD OFFICER]
```

## Summary

✅ **Code is working** - Field officer task creation is implemented
✅ **Project exists** - "DISASTER RISK PROTECTION TRAINING"
⏳ **Need to create EVENT** - Under the project
🎯 **Expected result** - Event will auto-get field officer task

**Create an EVENT (not a project) to see the field officer task!**
