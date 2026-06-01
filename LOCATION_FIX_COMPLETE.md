# Location Structure Fix - Complete

## Issue
User reported that barangay field was still showing in project forms, but it should ONLY be available for events. Projects should only have region and city.

## ✅ Changes Completed

### 1. Updated Project Type Definition (`models/types.ts`)
Added new top-level location fields to the Project interface:
```typescript
locationRegion?: string;
locationCity?: string;
locationBarangay?: string; // Only for events
```

### 2. Updated Project Form UI (`screens/ProjectLifecycleScreen.tsx`)

#### Conditional Barangay Field Display
- **Projects**: Show only Region and City dropdowns (barangay field removed)
- **Events**: Show Region and City (disabled/inherited from parent) + Barangay dropdown (editable)

#### Form Changes:
- Region picker: Disabled for events (inherited from parent)
- City picker: Disabled for events (inherited from parent)
- Barangay picker: Only shown for events (wrapped in conditional `{projectDraft.isEvent && ...}`)
- Updated helper text to reflect the new structure

### 3. Updated Validation Logic
Changed validation to match new requirements:
- **Projects**: Require only `projectRegionCode` and `projectCityCode`
- **Events**: Require `projectRegionCode`, `projectCityCode`, AND `projectBarangayCode`

### 4. Updated Save Logic
Modified `draftBaseProject` construction to save new location fields:
```typescript
locationRegion: projectRegionCode ? PHRegions.find(r => r.code === projectRegionCode)?.name : undefined,
locationCity: projectCityCode ? projectLocationCities.find(c => c.code === projectCityCode)?.displayName : undefined,
locationBarangay: projectDraft.isEvent && projectBarangayCode 
  ? projectLocationBarangays.find(b => b.code === projectBarangayCode)?.name 
  : undefined,
```

**Important**: `locationBarangay` is only saved for events (`projectDraft.isEvent` check)

### 5. Updated Edit Project Logic (`openEditProjectModal`)
When editing an existing project/event:
- First tries to load from new location fields (`locationRegion`, `locationCity`, `locationBarangay`)
- Falls back to parsing old `location.address` format if new fields not available
- For events, loads barangay dropdown options

### 6. Updated Create Event Logic (`openCreateEventModal`)
When creating a new event from a parent project:
- Auto-populates region and city from parent project's `locationRegion` and `locationCity`
- Loads barangay dropdown options for the inherited city
- Region and city pickers are disabled (inherited, not editable)
- Only barangay can be selected by user

### 7. Updated Edit Event Logic (`openEditProjectModal`)
When editing an existing event:
- **ALWAYS loads region and city from the parent project** (not from the event's own fields)
- Loads the event's barangay field if it has one
- Region and city pickers are disabled (inherited from parent)
- Only barangay picker is enabled

### 8. Updated Save Logic for Events
When saving an event:
- **Region and city are ALWAYS inherited from parent project** (not from form fields)
- Only barangay is saved from the form
- This ensures events always stay in sync with their parent project's location

### 7. Updated Location Display Components
- Created helper function `formatProjectLocation()` in `utils/locationFormat.ts`
- Updated `components/projects/ProjectCard.tsx` to use new format
- Updated all location displays in `ProjectLifecycleScreen.tsx` (5 locations)

## Result

### Projects ✅
- Only show Region and City fields
- Barangay field removed from UI
- Barangay NOT saved to database for projects
- Validation requires only region and city
- Display shows "City, Region" format

### Events ✅
- Region and City **ALWAYS inherited from parent project** (read-only, cannot be changed)
- Only Barangay field is editable
- Validation requires region, city, AND barangay
- When saved, region/city come from parent, only barangay is saved from form
- Display shows "Barangay, City, Region" format
- **Events automatically stay in sync with parent project location**

## Testing Checklist

- [ ] Create new project → Should only show region and city dropdowns
- [ ] Edit existing project → Should only show region and city dropdowns
- [ ] Save project → Should save `locationRegion` and `locationCity` only (no barangay)
- [ ] Create new event → Should show region/city (disabled) + barangay (enabled)
- [ ] Edit existing event → Should show all three fields with barangay editable
- [ ] Save event → Should save `locationRegion`, `locationCity`, AND `locationBarangay`
- [ ] Verify region/city are inherited from parent when creating event
- [ ] Verify location displays correctly in project cards and lists

## Files Modified

1. ✅ `models/types.ts` - Added new location fields to Project interface
2. ✅ `screens/ProjectLifecycleScreen.tsx` - Updated form UI, validation, save logic, edit/create functions, and all display sections
3. ✅ `components/projects/ProjectCard.tsx` - Updated location display
4. ✅ `utils/locationFormat.ts` - Created helper functions for consistent location formatting

## Optional Updates

See `REMAINING_LOCATION_UPDATES.md` for list of other screens that still use old `location.address` format. These are optional since backward compatibility is maintained.

## Database Status

Backend already supports the new fields:
- ✅ `location_region` column exists in projects and events tables
- ✅ `location_city` column exists in projects and events tables
- ✅ `location_barangay` column exists in projects and events tables
- ✅ Field name mapping configured in `relational_mirror.py`
- ✅ Data migration completed (8 projects, 5 events)
- ✅ Project barangay fields cleared (set to NULL)

## Backward Compatibility

The old `location` JSON field is still present and can be used for:
- Latitude/longitude coordinates (for maps)
- Fallback for old code that hasn't been updated yet
- The `formatProjectLocation()` helper checks new fields first, then falls back to old format

---

**Date**: May 30, 2026
**Status**: ✅ Complete - Ready for Testing
**Issue**: Barangay field removed from projects, only shown for events
