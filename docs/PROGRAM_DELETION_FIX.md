# Program, Project, and Event Deletion Fix

## Issue
Programs, projects, and events kept reappearing after deletion in the Project Lifecycle screen.

## Root Cause
The deletions were successful, but there was a race condition between:
1. The backend deletion completing
2. Cache invalidation
3. Real-time subscription reloading the data

The deletion functions properly deleted from backend and invalidated caches, but the real-time subscription would sometimes reload stale data before the cache was fully cleared.

## Solution Implemented

### Updated Three Deletion Functions in ProjectLifecycleScreen.tsx

1. **`handleDeleteProgram`** (lines ~1522-1555) - For program deletion
2. **`handleDeleteEventRecord`** (lines ~1758-1810) - For event deletion
3. **`handleDeleteProjectRecord`** (lines ~2491-2550) - For project deletion

**Changes made to all three functions:**
1. **Explicit cache clearing** - Added `clearStorageCache([...])` immediately after backend deletion
2. **Propagation delay** - Added 300ms delay to ensure backend deletion propagates before reloading
3. **Platform-specific alerts** - Fixed alerts to use `window.alert()` on web and `Alert.alert()` on mobile

### Code Changes

#### 1. Program Deletion (`handleDeleteProgram`)

```typescript
const handleDeleteProgram = (trackId: string, trackTitle: string) => {
  const doDelete = async () => {
    setActionLoadingKey(`deleteProgram-${trackId}`);
    try {
      // Optimistically remove from UI
      setProgramTracks(current => current.filter(track => track.id !== trackId));
      
      // Delete from backend
      await deleteProgram(trackId);
      
      // Force clear cache to ensure fresh data
      clearStorageCache(['programs', 'programTracks', 'projects', 'events']);
      
      // Wait a bit to ensure backend deletion propagates
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Reload fresh data
      await loadProgramTracks();
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`✅ Program Deleted\n\n"${trackTitle}" has been removed from the dashboard.`);
      } else {
        Alert.alert('✅ Program Deleted', `"${trackTitle}" has been removed from the dashboard.`);
      }
    } catch (error) {
      // On error, reload to restore correct state
      await loadProgramTracks();
      const errorMsg = getRequestErrorMessage(error, 'Failed to delete program.');
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Error\n\n${errorMsg}`);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setActionLoadingKey(null);
    }
  };
  
  // ... confirmation dialog code ...
};
```

#### 2. Event Deletion (`handleDeleteEventRecord`)

```typescript
const handleDeleteEventRecord = (event: Project) => {
  // ... validation code ...
  
  const doDelete = async () => {
    // ... UI state updates ...
    
    try {
      // Delete from backend
      await deleteProjectLikeRecord(event);
      
      // Force clear cache to ensure fresh data
      clearStorageCache(['events', 'projects', 'statusUpdates', 'volunteerProjectJoins', 'volunteerMatches', 'volunteerTimeLogs']);
      
      // Wait a bit to ensure backend deletion propagates
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Reload fresh data
      await loadProjects();
      
      showTaskSaveNotice(`Event "${event.title}" was deleted successfully.`, 1200);
    } catch (error) {
      // ... error handling with platform-specific alerts ...
    }
  };
  
  // ... confirmation dialog code ...
};
```

#### 3. Project Deletion (`handleDeleteProjectRecord`)

```typescript
const handleDeleteProjectRecord = () => {
  // ... validation code ...
  
  const doDelete = async () => {
    try {
      // Optimistically remove from UI
      setProjects(currentProjects => currentProjects.filter(project => project.id !== projectToDelete.id));
      
      // Delete from backend
      await deleteProjectLikeRecord(projectToDelete);
      
      // Force clear cache to ensure fresh data
      clearStorageCache(['projects', 'events', 'statusUpdates', 'volunteerProjectJoins', 'volunteerMatches', 'volunteerTimeLogs', 'partnerProjectApplications', 'partnerReports']);
      
      // Wait a bit to ensure backend deletion propagates
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Navigate back and clear related state
      handleReturnToProjectList();
      setStatusUpdates([]);
      setAllPartnerApplications([]);
      setPartnerReports([]);
      setVolunteerJoinRecords([]);
      
      // Reload fresh data
      await loadProjects();
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Deleted\n\n${projectToDelete.isEvent ? 'Event removed.' : 'Project removed.'}`);
      } else {
        Alert.alert('Deleted', projectToDelete.isEvent ? 'Event removed.' : 'Project removed.');
      }
    } catch (error) {
      // ... error handling with platform-specific alerts ...
    }
  };
  
  // ... confirmation dialog code ...
};
```

## How It Works

1. **Optimistic UI update** - Immediately removes program from UI for instant feedback
2. **Backend deletion** - Calls `deleteProgram()` which deletes from database and invalidates backend cache
3. **Force cache clear** - Explicitly clears frontend cache for all program-related keys
4. **Propagation delay** - Waits 300ms for backend changes to fully propagate (longer than the 200ms subscription delay)
5. **Fresh reload** - Loads program tracks from backend with cleared cache
6. **Platform-specific feedback** - Shows appropriate success/error message

## Why This Fix Works

The 300ms delay is critical because:
- Backend deletion broadcasts storage change event
- Real-time subscription triggers reload after 200ms delay (via `refreshDeferred`)
- Our 300ms delay ensures we reload AFTER the subscription has processed the deletion
- Cache clearing ensures no stale data is served

## Cache Keys Cleared

**Programs:**
- `programs`, `programTracks`, `projects`, `events`

**Events:**
- `events`, `projects`, `statusUpdates`, `volunteerProjectJoins`, `volunteerMatches`, `volunteerTimeLogs`

**Projects:**
- `projects`, `events`, `statusUpdates`, `volunteerProjectJoins`, `volunteerMatches`, `volunteerTimeLogs`, `partnerProjectApplications`, `partnerReports`

## Testing
- Verified no TypeScript errors
- Ready for manual testing on both web and mobile platforms
- Test all three deletion types:
  1. Delete a program (future programs)
  2. Delete a project
  3. Delete an event (future events)

## Files Modified
- `screens/ProjectLifecycleScreen.tsx` - Updated 3 deletion functions:
  - `handleDeleteProgram`
  - `handleDeleteEventRecord`
  - `handleDeleteProjectRecord`

## Related Functions
- `deleteProgram()` in `models/storage.ts` - Backend program deletion
- `deleteProject()` and `deleteEvent()` in `models/storage.ts` - Backend project/event deletion
- `getAllProgramTracks()` in `models/storage.ts` - Loading programs
- `subscribeToStorageChanges()` - Real-time updates
