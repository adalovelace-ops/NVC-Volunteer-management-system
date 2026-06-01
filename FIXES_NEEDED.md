# Issues Found and Fixes Needed

## 1. Map is Empty - Root Cause

The `getMappedProjects()` function in `utils/projectMap.ts` filters out your project because:

- Your project has `parentProjectId: null` and `isEvent: false`
- The function treats such projects as "programs" (top-level containers) and excludes them
- Only projects with a `parentProjectId` OR `isEvent: true` are shown on the map

### Current Filter Logic (lines 408-422 in projectMap.ts):
```typescript
export function getMappedProjects(projects: Project[]): Project[] {
  // Filter out programs (top-level items that are neither events nor have a parent)
  // Only show projects and events on the map
  const projectsAndEvents = projects.filter(project => {
    // If it has a parent, it's a project or event under a program - include it
    if (project.parentProjectId) {
      return true;
    }
    // If it's marked as an event, include it
    if (project.isEvent) {
      return true;
    }
    // Otherwise, it's a top-level program - exclude it
    return false;
  });
  // ... rest of the function
}
```

### Solution Options:

**Option A: Update the project to have a parent program**
- Create a "Nutrition" program first
- Then create your project under that program
- This follows the intended hierarchy: Programs > Projects > Events

**Option B: Mark the project as an event**
- Set `isEvent: true` on your project
- This will make it appear on the map

**Option C: Modify the filter logic** (NOT RECOMMENDED - breaks the design)
- Change `getMappedProjects()` to include standalone projects
- This would show programs on the map, which isn't the intended behavior

## 2. Missing Volunteer and Partner Preview Sections

Need to investigate if these sections exist in the ProjectLifecycleScreen UI.
The data is being loaded (volunteers, partners, volunteerJoinRecords, etc.) but the UI sections may not be rendered.

## Recommended Fix

**Create a proper program hierarchy:**

1. Create a "Nutrition" program (top-level container)
2. Create your "Nutrition Test Project" under that program
3. Optionally create events under the project

This matches the intended data model: Programs → Projects → Events
