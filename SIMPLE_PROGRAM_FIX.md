# Simple Program Fix - No Migration Needed!

## The Problem
- 4 programs are in `program_tracks` table (hardcoded, can't delete)
- We want them in `programs` table (deletable)

## The Simple Solution

### Step 1: Clear Existing Data
Go to Supabase dashboard and manually delete the one program_track entry:
1. Open `program_tracks` table
2. Delete the "DISASTER" row (or any rows you see)
3. Done!

### Step 2: Restart Backend
The backend will automatically seed the 4 programs into the `programs` table:

```bash
npm stop
npm start
```

### Step 3: Verify
1. Check Supabase `programs` table
2. Should see 4 new entries:
   - `program:Nutrition`
   - `program:Education`
   - `program:Livelihood`
   - `program:Disaster`

### Step 4: Test Deletion
1. Login as admin
2. Go to Program Management Suite
3. Delete any program
4. It works!

## What Changed in Code

### `backend/app_storage_seed.py`:
- ✅ Removed 4 entries from `programTracks` array
- ✅ Added 4 entries to `programs` array
- ✅ User accounts still seeded

### Result:
- Programs are seeded ONCE on first startup
- After that, they're regular deletable programs
- No re-seeding on restart

## That's It!

No migration script needed. Just:
1. Clear `program_tracks` table manually
2. Restart backend
3. Programs appear in `programs` table
4. Fully deletable!
