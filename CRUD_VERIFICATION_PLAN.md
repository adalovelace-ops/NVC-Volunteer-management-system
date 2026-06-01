# CRUD Verification Plan for Program Management Suite

## Pre-Test State
✅ Database: Clean (0 programs, 0 projects, 0 events)
✅ Backend: Running on port 8000
✅ API Snapshot: Returns empty response correctly
✅ Cache Architecture: Dual-layer (AsyncStorage frontend + backend collection cache)

---

## Test Phases

### Phase 1: Verify Empty State Display (Both Web & Mobile)
**Objective:** Ensure empty UI displays properly when no programs exist

#### Web UI (ProjectLifecycleScreen - Programs tab)
- [ ] Navigate to ProjectLifecycleScreen → Programs tab
- [ ] Should show: "Add program +" button card
- [ ] Should display: Empty card grid with add button
- [ ] Verify no stale programs appear from cache
- [ ] Open DevTools → Network → Check `/projects/snapshot` returns empty arrays

#### Mobile UI (Expo App)
- [ ] Open Expo app → Navigate to program management
- [ ] Should show: Empty state with add button
- [ ] Should display: No programs listed
- [ ] No stale data from AsyncStorage cache

---

### Phase 2: CREATE Program (Test INSERT)
**Objective:** Verify program creation works at UI level

#### Web UI
- [ ] Click "Add program +" button
- [ ] Fill form:
  - Title: "Test Program A"
  - Category: Select category
  - Location: Select location
  - Description: "Test description"
- [ ] Click Save
- [ ] Verify immediately appears in web UI (should be <2s)
- [ ] Check `projectsSnapshotCache` in DevTools (should be cleared)
- [ ] Force refresh page → should still show program (persistent)

#### Mobile UI
- [ ] Perform same creation on mobile
- [ ] Should appear immediately in mobile UI
- [ ] Both web and mobile show the same program

---

### Phase 3: CREATE Project (Test INSERT with Parent Link)
**Objective:** Verify project creation under a program

#### Web UI
- [ ] Click on created program
- [ ] Click "Create Project" button
- [ ] Fill form:
  - Title: "Test Project A1"
  - Status: "Planning"
  - Description: "Test project"
- [ ] Click Save
- [ ] Verify project appears under program
- [ ] Check parent link exists (parentProjectId = program id)

#### Mobile UI
- [ ] Same test on mobile
- [ ] Project should appear under same program

---

### Phase 4: CREATE Event (Test INSERT with Project Parent)
**Objective:** Verify event creation under a project

#### Web UI
- [ ] Click on created project
- [ ] Click "Add Event" button
- [ ] Fill form:
  - Title: "Test Event A1a"
  - Date: Tomorrow
  - Description: "Test event"
- [ ] Click Save
- [ ] Verify event appears in project
- [ ] Verify in Events tab shows this event

#### Mobile UI
- [ ] Same test on mobile
- [ ] Event should appear under same project

---

### Phase 5: EDIT Operations (Test UPDATE)
**Objective:** Verify edits persist and propagate to UI

#### Web UI - Edit Program
- [ ] Click on "Test Program A" → Edit
- [ ] Change title to: "Test Program A (Edited)"
- [ ] Save
- [ ] Verify title updates in UI immediately
- [ ] Mobile should reflect change

#### Web UI - Edit Project
- [ ] Click on project → Edit
- [ ] Change status from "Planning" to "In Progress"
- [ ] Save
- [ ] Verify status updates immediately
- [ ] Mobile should reflect change

#### Web UI - Edit Event
- [ ] Click on event → Edit
- [ ] Change title to: "Test Event A1a (Updated)"
- [ ] Save
- [ ] Verify updates immediately

---

### Phase 6: DELETE Operations (Test DELETE with Cache Invalidation)
**Objective:** Verify deletions properly remove items and invalidate caches

#### Web UI - Delete Event First
- [ ] Click on event → Delete
- [ ] Confirm deletion
- [ ] Should disappear immediately from UI
- [ ] Check `projectsSnapshotCache` cleared
- [ ] Check WebSocket broadcast received

#### Web UI - Delete Project
- [ ] Click on project → Delete
- [ ] Confirm deletion
- [ ] Should disappear immediately
- [ ] Check Events tab → event should also disappear

#### Web UI - Delete Program
- [ ] Click on program → Delete
- [ ] Confirm deletion
- [ ] Should disappear immediately
- [ ] All related projects/events should cascade delete

---

### Phase 7: Cross-Platform Consistency Check
**Objective:** Verify web and mobile stay in sync

#### Create-Update-Delete Cycle
- [ ] On web: Create new program "Sync Test Program"
- [ ] On mobile: Should see it within 120s (snapshot cache TTL)
- [ ] On mobile: Edit program title to "Sync Test Program (Mobile Edit)"
- [ ] On web: Should see edit within 120s
- [ ] On web: Delete program
- [ ] On mobile: Should disappear within 120s

---

## Cache Invalidation Verification

### Frontend Cache (AsyncStorage + projectsSnapshotCache)
- [ ] After CREATE: `projectsSnapshotCache.clear()` called
- [ ] After UPDATE: `projectsSnapshotCache.clear()` called
- [ ] After DELETE: `projectsSnapshotCache.clear()` called
- [ ] WebSocket notification received: `storageChangeSubscribers` triggered

### Backend Cache (Collection cache + snapshot cache)
- [ ] After CREATE: `_invalidate_collection_cache()` called
- [ ] After UPDATE: `_invalidate_collection_cache()` called
- [ ] After DELETE: `_invalidate_collection_cache()` + `_projects_snapshot_cache.clear()`
- [ ] WebSocket broadcast sent: `broadcast_storage_event()`

---

## Success Criteria
✅ All CRUD operations work through UI
✅ Empty state displays correctly
✅ Changes appear immediately in creating UI
✅ Changes propagate to other UIs within TTL
✅ Deletions cascade properly
✅ No stale data in any cache
✅ WebSocket events broadcast correctly

---

## Key Files to Monitor
- Backend: `backend/api.py` lines 3841-3980 (delete endpoint, cache invalidation)
- Backend: `backend/api.py` lines 4074-4145 (PUT storage endpoint, cache invalidation)
- Frontend: `models/storage.ts` lines 1880-1940 (getProjectsScreenSnapshot, cache logic)
- Frontend: `models/storage.ts` lines 2034-2070 (deleteProgram, invalidation)
- Frontend: `screens/ProjectLifecycleScreen.tsx` lines 2950-3050 (renderProgramSection, empty state)
- Frontend: `screens/ProjectLifecycleScreen.tsx` lines 6675-6900 (Programs tab rendering)

---

## Notes
- Snapshot cache TTL: 120s (PROJECTS_SNAPSHOT_CACHE_TTL_MS in models/storage.ts)
- Shared storage cache TTL: 600s (SHARED_STORAGE_CACHE_TTL_MS)
- WebSocket used for real-time storage change broadcasts
- Cascade deletion handled by backend: program delete → cascade projects → cascade events
