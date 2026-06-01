# How to Test Field Officer Task

## Current Status ✅

- **DISASTER program**: Successfully saved to database (ID: `s ssdadadad`)
- **Demo accounts**: All 5 accounts are in the database and working
- **Field officer code**: Implemented and ready to work

## Why You Don't See Field Officer Task Yet

The field officer task is **only created for EVENTS**, not for programs or projects.

You need to follow this hierarchy:
```
Program (DISASTER) 
  └── Project (e.g., "Relief Operations")
        └── Event (e.g., "Distribution Day 1") ← Field Officer task created HERE
```

## Step-by-Step Testing Guide

### Step 1: Log in as Admin
1. Open the web app
2. Click "Quick Demo Sign In" for Admin
3. Or manually enter: `admin@nvc.org` / `admin123`

### Step 2: Create a Project Under DISASTER Program
1. Go to the Projects/Programs section
2. Click "Create New Project" or "+"
3. Fill in the project details:
   - **Title**: "Relief Operations" (or any name)
   - **Program**: Select "DISASTER" from dropdown
   - **Region**: Select any region (e.g., "National Capital Region (NCR)")
   - **City**: Select any city (e.g., "Manila")
   - **Start Date**: Today or any date
   - **End Date**: Future date
   - **Description**: Any description
   - **Make sure "Is Event" checkbox is UNCHECKED** (this is a project, not an event)
4. Click "Save" or "Create"

### Step 3: Create an Event Under That Project
1. Find the project you just created
2. Click on it to view details
3. Look for "Create Event" or "Add Event" button
4. Fill in the event details:
   - **Title**: "Distribution Day 1" (or any name)
   - **Parent Project**: Should auto-select the project you're under
   - **Region & City**: Should be READ-ONLY and inherited from parent project
   - **Barangay**: Select any barangay (this is the only location field you can edit)
   - **Start Date**: Event date
   - **End Date**: Event end date
   - **Description**: Any description
   - **Make sure "Is Event" checkbox is CHECKED**
5. Click "Save" or "Create Event"

### Step 4: Verify Field Officer Task
1. After creating the event, open the event details
2. Scroll down to the "Event Task Board" section
3. You should see:
   - **Task Assignments** card showing "1 total task"
   - Click on it to expand
4. You should see a task with:
   - **Title**: "Field Officer"
   - **Description**: "Field officer responsible for on-site event coordination and management"
   - **Category**: "Event Management"
   - **Priority**: "High"
   - **Status**: "Unassigned"
   - **Skills needed**: Event Management, Leadership, Communication

## What the Field Officer Task Looks Like

```
┌─────────────────────────────────────────┐
│ Event Task Board                    [+] │
├─────────────────────────────────────────┤
│ Task Assignments                      > │
│ 1 total task • 0 assigned               │
└─────────────────────────────────────────┘

When expanded:
┌─────────────────────────────────────────┐
│ Field Officer                      HIGH │
│ Event Management                        │
├─────────────────────────────────────────┤
│ Field officer responsible for on-site   │
│ event coordination and management       │
│                                         │
│ Skills needed: Event Management,        │
│ Leadership, Communication               │
│                                         │
│ Status: Unassigned                      │
│ [Assign Volunteer]                      │
└─────────────────────────────────────────┘
```

## Troubleshooting

### "I don't see the Event Task Board"
- Make sure you're viewing an **EVENT**, not a project or program
- The Event Task Board only appears for events

### "The task list is empty"
- Check if you created an EVENT (not a project)
- Try creating a new event to trigger the automatic task creation
- Check the browser console for any errors

### "I can't create a project/event"
- Make sure you're logged in as admin
- Check that all required fields are filled
- Make sure dates are valid (end date after start date)

### "The DISASTER program disappeared"
- It's still in the database! Run this to verify:
  ```bash
  cd backend
  python check_event_tasks.py
  ```

## Quick Database Check

To verify what's in your database:

```bash
cd backend
python check_event_tasks.py
```

This will show:
- All events and their internal tasks
- All programs in the database
- Whether field officer tasks exist

## Summary

✅ **DISASTER program**: Saved and working  
✅ **Demo accounts**: All working  
✅ **Field officer code**: Implemented  
⏳ **Next step**: Create a project, then create an event under it  
🎯 **Expected result**: Event automatically gets a "Field Officer" task
