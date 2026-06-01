# Test: Automatic Parent Project Assignment

## Test Steps

### 1. Create a New Project in "Final Test Program"
1. Open the app and navigate to the Program Management Suite
2. Find "Final Test Program" section
3. Click the "Create Project" button (the one with the + icon)
4. Fill in the project details:
   - **Title**: "Test Parent Assignment Project"
   - **Description**: "Testing automatic parent assignment"
   - **Start Date**: Today
   - **End Date**: 7 days from today
   - **Location**: Select any region and city (e.g., Bacolod City, Negros Occidental)
   - **Volunteers Needed**: 10
5. Click "Save"

### 2. Verify in UI
After saving, check:
- ✅ Project appears under "Final Test Program Projects" section
- ✅ Project count increases (e.g., "2 projects in this program")
- ✅ Project card shows with correct details

### 3. Verify on Map
1. Navigate to the Map screen
2. Check:
   - ✅ A new map pin appears at the selected location
   - ✅ Clicking the pin shows the project details
   - ✅ Project is not filtered out

### 4. Verify in Database
Run this query in Supabase:
```sql
SELECT 
  projects_id, 
  title, 
  parent_project_id, 
  program_id 
FROM projects 
WHERE title = 'Test Parent Assignment Project';
```

Expected result:
```
projects_id: project-[timestamp]
title: Test Parent Assignment Project
parent_project_id: program:FinalTest
program_id: program:FinalTest
```

## Expected Behavior

### Before Fix
- `parent_project_id` would be `NULL`
- Project would not show on map
- Project might not group properly under program

### After Fix
- `parent_project_id` automatically set to `program:FinalTest`
- `program_id` also set to `program:FinalTest`
- Project shows on map with correct pin
- Project properly grouped under "Final Test Program"

## Troubleshooting

### If project doesn't appear in UI:
1. Refresh the page
2. Clear backend cache: `curl -X POST http://127.0.0.1:8000/admin/clear-cache`
3. Check browser console for errors

### If project doesn't show on map:
1. Verify coordinates are valid (not 0, 0)
2. Check that `parent_project_id` is set in database
3. Verify location was properly selected during creation

### If parent_project_id is NULL:
1. Make sure you clicked "Create Project" from INSIDE the program section
2. Check that the frontend changes were applied correctly
3. Verify the backend is running the updated code

## Success Criteria
✅ All new projects created within a program automatically have:
- `parent_project_id` set to the program ID
- `program_id` set to the program ID
- Valid coordinates from selected location
- Visible in UI under the correct program
- Visible on map with a pin
