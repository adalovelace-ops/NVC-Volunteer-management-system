# Check Browser Console NOW

I've added debug logging to the map. Here's what to do:

## Steps to Check

### 1. Open Browser Console
- Press `F12` or `Ctrl + Shift + I` (Windows/Linux)
- Or `Cmd + Option + I` (Mac)
- Click on the "Console" tab

### 2. Refresh the Page
- Press `Ctrl + Shift + R` (hard refresh)
- Or click the refresh button

### 3. Look for Debug Messages

You should see messages like:

```
[MAP DEBUG] loadProjects - snapshot.projects: 2
[MAP DEBUG] loadProjects - mapSourceProjects: 2
[MAP DEBUG] loadProjects - visibleProjects: 2
[MAP DEBUG] loadProjects - visibleProjects details: [...]
[MAP DEBUG] Total displayProjects: 2
[MAP DEBUG] displayProjects: [...]
[MAP DEBUG] Filtered mappedProjects: 1
[MAP DEBUG] mappedProjects: [...]
[MAP DEBUG] Creating markers for 1 projects
[MAP DEBUG] Creating marker for: Nutrition Test Project at 10.68 122.97
```

## What to Look For

### ✅ Good Signs:
- `visibleProjects: 2` (or more)
- `mappedProjects: 1` (or more)
- `Creating marker for: Nutrition Test Project`
- Project has `parentProjectId: "program:FinalTest"`

### ❌ Bad Signs:
- `visibleProjects: 0` - Projects not loading
- `mappedProjects: 0` - Projects being filtered out
- `parentProjectId: null` or `undefined` - Parent not set
- No "Creating marker" messages - Markers not being created
- JavaScript errors in red

## Common Issues & Solutions

### Issue 1: `visibleProjects: 0`
**Problem**: Projects not loading from API
**Solution**: 
```bash
curl -X POST http://127.0.0.1:8000/admin/clear-cache
```
Then refresh browser

### Issue 2: `mappedProjects: 0` but `visibleProjects: 2`
**Problem**: Projects being filtered out by `getMappedProjects()`
**Check**: Look at the `displayProjects` array - does the project have `parentProjectId`?
**Solution**: If `parentProjectId` is null, the database update didn't work

### Issue 3: Markers created but not visible
**Problem**: Google Maps API issue or coordinates issue
**Check**: 
- Look for Google Maps errors in console
- Verify coordinates are valid (not 0, 0)
- Check if map container has height/width

### Issue 4: JavaScript errors
**Problem**: Code error preventing execution
**Solution**: Share the error message so I can fix it

## What to Tell Me

After checking the console, tell me:

1. **What do you see?**
   - Copy the `[MAP DEBUG]` messages
   - Copy any error messages (in red)

2. **Key numbers:**
   - `visibleProjects: ?`
   - `mappedProjects: ?`
   - `Creating markers for ? projects`

3. **Does the project have parentProjectId?**
   - Look in the `displayProjects` array
   - Find "Nutrition Test Project"
   - Check if `parentProjectId: "program:FinalTest"`

## Quick Test

If you see:
```
[MAP DEBUG] Creating marker for: Nutrition Test Project at 10.68 122.97
```

Then the marker IS being created! The issue might be:
- Map zoom level (try zooming out)
- Map center (try panning around)
- Marker icon not loading
- Google Maps API key issue

## Screenshot

If possible, take a screenshot of:
1. The browser console with the debug messages
2. The map area (even if empty)

This will help me see exactly what's happening!
