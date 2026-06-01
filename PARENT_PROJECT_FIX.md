# Automatic Parent Project Assignment Fix

## Problem
When creating a new project inside a program (like "Final Test Program"), the project was not automatically linked to that program via `parent_project_id`. This caused:
1. Projects not showing on the map (map filters out items without `parentProjectId`)
2. Projects not properly grouped under their parent program

## Solution
Fixed the project creation flow to automatically set `parent_project_id` when creating a project within a program context.

## Changes Made

### 1. Frontend - ProjectLifecycleScreen.tsx

#### Change 1: Set parentProjectId in draft
**Location**: `openCreateProjectInProgramModal` function (line ~1404)

**Before**:
```typescript
const draft = createEmptyProjectDraft('', module, false, '', '', undefined);
draft.program_id = trackId;
draft.programModule = trackId as AdvocacyFocus;
```

**After**:
```typescript
const draft = createEmptyProjectDraft('', module, false, '', '', undefined);
draft.program_id = trackId;
draft.programModule = trackId as AdvocacyFocus;
draft.parentProjectId = trackId; // Set parent to link project to program
```

**Why**: When opening the create project modal from within a program, we now set the `parentProjectId` to the program's ID so the project knows its parent.

#### Change 2: Save parentProjectId for non-event projects
**Location**: `handleSaveProjectRecord` function (line ~2063)

**Before**:
```typescript
parentProjectId: projectDraft.isEvent ? resolvedEventParentProjectId : undefined,
```

**After**:
```typescript
parentProjectId: projectDraft.isEvent ? resolvedEventParentProjectId : (projectDraft.parentProjectId || undefined),
```

**Why**: Previously, only events could have a `parentProjectId`. Now regular projects can also have a parent (the program they belong to).

### 2. Frontend - storage.ts

#### Change: Don't strip parentProjectId when saving
**Location**: `saveProject` function (line ~3356)

**Before**:
```typescript
const normalizedProject = normalizeProjectRecord({
  ...project,
  isEvent: false,
  parentProjectId: undefined,  // <-- This was removing the parent!
  skillsNeeded: normalizeProjectSkillsNeeded(project, project.internalTasks || []),
});
```

**After**:
```typescript
const normalizedProject = normalizeProjectRecord({
  ...project,
  isEvent: false,
  skillsNeeded: normalizeProjectSkillsNeeded(project, project.internalTasks || []),
});
```

**Why**: The old code was explicitly removing `parentProjectId` from all projects. Now we preserve it so projects can maintain their link to their parent program.

## How It Works Now

### Project Creation Flow
1. User clicks "Create Project" button inside a program (e.g., "Final Test Program")
2. `openCreateProjectInProgramModal` is called with `trackId = "program:FinalTest"`
3. A new project draft is created with:
   - `program_id = "program:FinalTest"`
   - `parentProjectId = "program:FinalTest"`
4. User fills in project details and saves
5. `handleSaveProjectRecord` preserves the `parentProjectId` when building the project object
6. `saveProject` in storage.ts saves the project WITH the `parentProjectId` intact
7. Backend stores the project with `parent_project_id` in the database

### Result
- ✅ New projects automatically linked to their parent program
- ✅ Projects show up on the map (because they have `parentProjectId`)
- ✅ Projects properly grouped under their program in the UI
- ✅ Consistent hierarchy: Program → Projects → Events

## Testing
To test the fix:
1. Navigate to a program (e.g., "Final Test Program")
2. Click "Create Project"
3. Fill in the required fields and save
4. The new project should:
   - Appear in the program's project list
   - Show up on the map with a pin
   - Have `parent_project_id` set to the program ID in the database

## Database Schema
```
programs table:
  - programs_id (e.g., "program:FinalTest")
  
projects table:
  - projects_id (e.g., "project-1234567890")
  - parent_project_id → references programs.programs_id
  - program_id → also references programs.programs_id (for UI filtering)
```

## Important Notes
- **program_id**: Used for UI filtering and grouping
- **parent_project_id**: Used for hierarchy and map display
- Both should be set to the same program ID when creating a project within a program
- Events have their `parent_project_id` set to the project they belong to
