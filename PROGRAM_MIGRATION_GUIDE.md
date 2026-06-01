# Program Migration Guide: program_tracks → programs

## What Changed

### Before:
- 4 hardcoded programs in `program_tracks` table (DISASTER, Nutrition, Education, Livelihood)
- Could NOT be deleted
- Separate table from regular programs
- Re-seeded on every startup

### After:
- All programs in `programs` table
- CAN be deleted like any other program
- Single unified table
- No re-seeding (except user accounts)

## Migration Steps

### Step 1: Run Migration Script

This moves existing program_tracks data to the programs table:

```bash
cd c:\Users\ACER\OneDrive\Desktop\volunteer-system\backend
python migrate_program_tracks_to_programs.py
```

**What it does**:
- Reads all program_tracks
- Converts them to programs format with `program:` prefix
- Adds them to programs table
- Clears program_tracks table
- Commits changes

**Expected output**:
```
=== MIGRATING PROGRAM TRACKS TO PROGRAMS ===

Found 4 program tracks
Found X existing programs

✓ Converting: Nutrition → program:Nutrition
✓ Converting: Education → program:Education
✓ Converting: Livelihood → program:Livelihood
✓ Converting: Disaster → program:Disaster

✅ Migration complete!
   - Migrated 4 program tracks to programs
   - Total programs now: X
   - Cleared program_tracks table

Programs created:
   - program:Nutrition: Nutrition
   - program:Education: Education
   - program:Livelihood: Livelihood
   - program:Disaster: Disaster
```

### Step 2: Verify Database

Check Supabase dashboard:
1. Open `programs` table
2. Should see 4 new entries with IDs: `program:Nutrition`, `program:Education`, `program:Livelihood`, `program:Disaster`
3. Open `program_tracks` table
4. Should be empty

### Step 3: Restart Backend

```bash
npm stop
npm start
```

The backend will:
- NOT re-seed program_tracks (it's now empty in seed data)
- Keep user accounts seeded
- Use programs table for everything

### Step 4: Test Deletion

1. Login as admin
2. Go to Program Management Suite
3. Try deleting any of the 4 programs
4. Should work now!

## Changes Made to Code

### 1. `backend/app_storage_seed.py`
- **Removed**: 4 hardcoded program_tracks entries
- **Added**: 4 programs entries with `program:` prefix
- **Result**: Programs are seeded once, then deletable

### 2. `backend/migrate_program_tracks_to_programs.py` (NEW)
- Migration script to move existing data
- Run once to migrate
- Can be deleted after migration

## Program ID Format

### Old Format (program_tracks):
- `Nutrition`
- `Education`
- `Livelihood`
- `Disaster`

### New Format (programs):
- `program:Nutrition`
- `program:Education`
- `program:Livelihood`
- `program:Disaster`

The `program:` prefix distinguishes top-level programs from projects/events.

## Database Schema

### programs table structure:
```json
{
  "id": "program:Nutrition",
  "title": "Nutrition",
  "description": "Food security and health programs...",
  "icon": "restaurant",
  "color": "#dc2626",
  "imageUrl": "",
  "sortOrder": 10,
  "isActive": true,
  "parentProjectId": null,  // Top-level programs have no parent
  "isEvent": false,         // Programs are not events
  "createdAt": "2026-05-31T...",
  "updatedAt": "2026-05-31T..."
}
```

## Frontend Impact

### No changes needed!
The frontend already uses the `programs` table through the API. The migration is transparent to the UI.

### Deletion now works:
- Click delete icon on any program
- Confirm deletion
- Program is removed from database
- Will NOT come back on restart

## Rollback (if needed)

If something breaks, you can rollback:

1. **Restore program_tracks seed data** in `app_storage_seed.py`
2. **Remove programs entries** from seed data
3. **Restart backend**: `npm stop && npm start`
4. **Re-seed**: Programs will be back in program_tracks

## Testing Checklist

- [ ] Run migration script successfully
- [ ] Verify 4 programs in database (program:Nutrition, etc.)
- [ ] Verify program_tracks table is empty
- [ ] Restart backend without errors
- [ ] Login as admin
- [ ] See 4 programs in Program Management Suite
- [ ] Delete one program successfully
- [ ] Restart backend - deleted program stays deleted
- [ ] Create new program - works normally
- [ ] Delete new program - works normally

## Notes

- **User accounts still seeded**: Admin, volunteer, partner accounts remain
- **Projects/events unchanged**: Only top-level programs affected
- **One-time migration**: Run script once, then delete it
- **Fully deletable**: All programs can now be deleted by admin
- **No re-seeding**: Deleted programs won't come back

## Support

If you encounter issues:
1. Check backend logs: `.dev-pids/backend.log`
2. Check database in Supabase dashboard
3. Verify migration script output
4. Check browser console for frontend errors
