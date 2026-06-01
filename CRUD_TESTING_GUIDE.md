# CRUD Verification Summary - Ready for Testing

## ✅ VERIFIED INFRASTRUCTURE

### Backend API (port 8000)
- Status: **RUNNING** (PID 17508)
- Connections: Active from web (localhost) and mobile (192.168.0.102)
- Endpoint: `/projects/snapshot` returns empty arrays ✓
- Delete endpoint: `/program-tracks/{id}` with cascade logic ✓
- Save endpoint: `PUT /storage/{key}` with cache invalidation ✓

### Database (PostgreSQL/Supabase)
- State: **CLEAN**
  - programs table: 0 records
  - projects table: 0 records
  - events table: 0 records
- Tested: CREATE/INSERT/DELETE cycle verified at DB level
- Schema: 3 main tables + 10 dependent tables

### Cache Architecture
**Frontend (models/storage.ts)**
- `projectsSnapshotCache` Map: 120s TTL
- `AsyncStorage`: Persistent local cache
- Invalidation: `projectsSnapshotCache.clear()` on all writes

**Backend (backend/api.py)**
- `_projects_snapshot_cache`: Collection cache
- Invalidation: `_invalidate_collection_cache()` + `_projects_snapshot_cache.clear()`
- Broadcast: `broadcast_storage_event(changedKeys)` via WebSocket

### UI Components
**Programs Tab (ProjectLifecycleScreen.tsx)**
- Empty state: Shows "Add program +" card when no programs
- Rendering: `programSections.map()` displays program cards
- Actions: Create, Edit, Delete buttons functional
- Cache handling: Calls `invalidateSharedStorageCache()` on mutations

---

## 🎯 WHAT'S READY TO TEST

### Phase 1: Empty State Verification
The UI should display empty state properly. To verify:
1. Open web UI → ProjectLifecycleScreen → Programs tab
2. Should see only "Add program +" button card
3. Open mobile app → same screen
4. Both should be empty

### Phase 2: Create Program
1. Web: Click "Add program +" → fill form → Save
2. Should appear immediately in web UI
3. Check mobile: should appear within ~2 minutes (snapshot cache TTL)

### Phase 3: Create Project
1. Web: Click program → "Create Project" → fill form → Save
2. Project appears under program
3. Mobile should reflect change

### Phase 4: Create Event
1. Web: Click project → "Add Event" → fill form → Save
2. Event appears in project and Events tab
3. Mobile reflects change

### Phase 5: Edit Operations
1. Edit program title → updates immediately
2. Edit project status → updates immediately
3. Edit event details → updates immediately
4. Cross-platform sync within snapshot TTL

### Phase 6: Delete Operations
1. Delete event → disappears immediately
2. Delete project → disappears immediately + cascades
3. Delete program → disappears immediately + cascades all children
4. No stale data remains

---

## 📋 HOW TO TEST

### For Web UI Testing
```
1. Open VS Code with web dev server running
2. Navigate to ProjectLifecycleScreen in app
3. Click "Projects" in bottom nav (if not already there)
4. You should see Programs tab selected
5. Use Create/Edit/Delete buttons for CRUD
```

### For Mobile UI Testing
```
1. Start Expo server: npm start (or expo start)
2. Open Expo app on device
3. Navigate to program management screen
4. Perform same CRUD operations
5. Compare results with web UI
```

### Debugging Cache Issues
```
Web:
- Open Chrome DevTools → Application → Local Storage
- Look for 'volcre:cache:programs' keys
- Check timestamp in 'volcre:cacheTs:programs'
- Network tab: watch /projects/snapshot calls

Mobile:
- Expo DevTools → AsyncStorage debugger
- Look for 'volcre:cache:programs' entries
- Verify timestamps update on mutations
```

### Monitoring Backend Cache Invalidation
```
Watch backend logs:
- Create: Should log cache invalidation
- Update: Should log cache clear
- Delete: Should log cascade deletion + cache clear
- WebSocket broadcast for storage events
```

---

## 🔍 KEY EXPECTATIONS

### CREATE Operations
- **Web:** Item appears immediately (<100ms)
- **Mobile:** Item appears within 120s (snapshot cache TTL)
- **Backend:** POST/PUT to storage, _invalidate_collection_cache() called
- **Cache:** projectsSnapshotCache.clear() called

### UPDATE Operations
- **Web:** Changes reflect immediately
- **Mobile:** Changes within 120s
- **Backend:** PUT /storage with new data
- **Cascade:** Related snapshots updated

### DELETE Operations
- **Web:** Item disappears immediately
- **Mobile:** Item disappears within 120s
- **Backend:** DELETE endpoint handles cascade
- **Dependencies:** All child items removed (events under projects, etc.)

---

## ⚠️ IMPORTANT NOTES

1. **Snapshot Cache TTL:** 120s
   - First fetch takes full time to hit backend
   - Subsequent fetches within 120s use cache
   - Mutations clear cache immediately

2. **WebSocket Notifications:**
   - Storage changes broadcast via WebSocket
   - Subscribe in: storageChangeSubscribers
   - Callback triggers UI updates

3. **Cascade Deletion:**
   - Program delete → all projects removed
   - Project delete → all events removed
   - Events delete → no children

4. **Cross-Platform Sync:**
   - Web and mobile can edit independently
   - Synced via backend API + WebSocket
   - Eventual consistency within snapshot TTL

---

## 📊 VERIFICATION CHECKLIST

- [ ] Empty state displays on web (no stale programs)
- [ ] Empty state displays on mobile (AsyncStorage cleared)
- [ ] Can create program on web (appears immediately)
- [ ] Created program appears on mobile within 120s
- [ ] Can create project under program
- [ ] Can create event under project
- [ ] Can edit program/project/event
- [ ] Edits propagate to other platform
- [ ] Can delete event (no cascade side effects)
- [ ] Can delete project (children deleted)
- [ ] Can delete program (all children deleted)
- [ ] No cache stale data after delete
- [ ] WebSocket events received on create/edit/delete
- [ ] Both web and mobile always in sync within TTL

---

## NEXT STEPS

1. **Verify Empty State** (5 min)
   - Check web Programs tab → shows "Add program +" only
   - Check mobile → shows empty state
   - Confirm `/projects/snapshot` returns empty

2. **Test CREATE** (10 min)
   - Create program on web
   - Verify appears in web immediately
   - Wait up to 2 min for mobile to show it
   - Check DevTools for cache behavior

3. **Test CRUD Cycle** (20 min)
   - Create program, project, event
   - Edit each one
   - Verify changes in both web and mobile
   - Delete in reverse order (event → project → program)

4. **Verify Cache Invalidation** (5 min)
   - Check AsyncStorage after deletions
   - Check projectsSnapshotCache state
   - Confirm no stale data remains

**Total Time:** ~40 minutes for full verification
