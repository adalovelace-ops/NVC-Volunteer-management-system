# Debug: Map Pin Not Showing

## Current Status

### Database ✅
- Project exists: "Nutrition Test Project"
- Has valid coordinates: lat=10.68, lon=122.97
- Has parentProjectId: "program:FinalTest"
- Should pass filter: YES (has parentProjectId)

### API ✅
- Backend returns project correctly
- Filter logic confirms it should show

### Frontend Code ✅
- `getMappedProjects()` filter logic is correct
- Web map rendering code looks correct
- Markers are created for all `mappedProjects`

## Possible Issues

### 1. Frontend Cache
The web app might be using cached data from before the fix.

**Solution**: Hard refresh the browser
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

### 2. Development Server Not Restarted
The Expo/React Native web server might not have picked up the code changes.

**Solution**: Restart the development server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
# or
npx expo start
```

### 3. Browser Console Errors
There might be JavaScript errors preventing the map from rendering.

**Solution**: Open browser console (F12) and check for errors

## Testing Steps

### Step 1: Clear All Caches
```bash
# Clear backend cache
curl -X POST http://127.0.0.1:8000/admin/clear-cache

# Hard refresh browser (Ctrl+Shift+R)
```

### Step 2: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors related to:
   - Google Maps API
   - Project loading
   - Marker creation

### Step 3: Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Find the request to `/projects/snapshot`
5. Check the response - should include "Nutrition Test Project"

### Step 4: Add Debug Logging
Add this to the web map component to see what's happening:

```typescript
// In MappingScreen.web.tsx, after line 244
const mappedProjects = React.useMemo(() => {
  const result = getMappedProjects(displayProjects);
  console.log('[MAP DEBUG] displayProjects:', displayProjects.length);
  console.log('[MAP DEBUG] mappedProjects:', result.length);
  console.log('[MAP DEBUG] mappedProjects:', result.map(p => ({
    id: p.id,
    title: p.title,
    parentProjectId: p.parentProjectId,
    lat: p.location.latitude,
    lng: p.location.longitude
  })));
  return result;
}, [displayProjects]);
```

## Expected Console Output

After adding debug logging, you should see:
```
[MAP DEBUG] displayProjects: 2
[MAP DEBUG] mappedProjects: 1
[MAP DEBUG] mappedProjects: [{
  id: "project-1780244863222",
  title: "Nutrition Test Project",
  parentProjectId: "program:FinalTest",
  lat: 10.68,
  lng: 122.97
}]
```

## Quick Fix Checklist

- [ ] Clear backend cache: `curl -X POST http://127.0.0.1:8000/admin/clear-cache`
- [ ] Hard refresh browser: `Ctrl + Shift + R`
- [ ] Check browser console for errors
- [ ] Verify `/projects/snapshot` returns the project
- [ ] Check that `mappedProjects.length` shows 1 (not 0)
- [ ] Verify Google Maps API key is valid

## If Still Not Working

### Check Google Maps API Key
The map might not be rendering if the API key is invalid or has restrictions.

1. Check `.env` file for `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY`
2. Verify the key is valid in Google Cloud Console
3. Check that the key has "Maps JavaScript API" enabled
4. Check for any domain restrictions

### Check Map Container
The map container might not be visible due to CSS issues.

1. Open browser DevTools
2. Inspect the map container element
3. Check if it has height/width
4. Check if it's hidden by CSS

## Most Likely Solution

**Hard refresh the browser** - The frontend is probably using cached data from before the `parentProjectId` was set.

Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac) to force a full reload.
