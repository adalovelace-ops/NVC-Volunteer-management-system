# Volunteer Coverage and Slots Fields - Project vs Event Separation

## Issue
User requested to:
- **Remove** volunteer coverage and slots from **PROJECT** details and creation
- **Keep** volunteer coverage and slots for **EVENT** details and creation

## Changes Made

### 1. Project Details Display (Hero Highlights)

**Location:** `ProjectLifecycleScreen.tsx` lines ~5295-5330

**Changed to show volunteer coverage ONLY for events:**

```typescript
const heroHighlights = [
  {
    icon: 'calendar-month' as const,
    label: 'Schedule',
    value: formattedScheduleRange,
  },
  // Show volunteer coverage only for events, not projects
  ...(activeSelectedProject.isEvent
    ? [{
      icon: 'groups' as const,
      label: 'Confirmed Team',
      value: `${volunteerSlotsFilled}/${volunteerSlotsNeeded}`,
    }]
    : []),
  {
    icon: 'location-on' as const,
    label: 'Location',
    value: activeSelectedProject.location.address || 'Location not set',
  },
  // ... more fields
];
```

**Result:**
- ✅ Events show "Confirmed Team" badge with volunteer counts
- ❌ Projects do NOT show volunteer coverage

**Also updated caption text:**
- Projects: `'Review program setup and delivery details in one place.'`
- Events: `'Track staffing, schedule, and delivery activity from a single event workspace.'`

### 2. Project/Event Creation Form

**Location:** `ProjectLifecycleScreen.tsx` lines ~4290-4320

**Changed to show volunteer slots field ONLY for events:**

```typescript
{/* Show Volunteer Slots field only for events, not projects */}
{projectDraft.isEvent && (
  <View style={[styles.formRow, styles.formRowReverse]}>
    <TextInput
      style={[styles.textArea, styles.inputWithLabel, styles.singleLineInput]}
      placeholder="Volunteer slots"
      placeholderTextColor="#999"
      keyboardType="number-pad"
      value={projectDraft.volunteersNeeded}
      onChangeText={value => handleProjectDraftChange('volunteersNeeded', value)}
    />
    <Text style={styles.labelRight}>Volunteer Slots</Text>
  </View>
)}
```

**Result:**
- ✅ Event creation form shows "Volunteer Slots" input field
- ❌ Project creation form does NOT show "Volunteer Slots" input field

### 3. Updated Save Function

**Location:** `ProjectLifecycleScreen.tsx` line ~2228

**Changed to set volunteersNeeded based on type:**

```typescript
// For events, use the user-provided value; for projects, set to 0
const volunteersNeeded = projectDraft.isEvent ? Number(projectDraft.volunteersNeeded) : 0;
```

**Result:**
- ✅ Events save with user-specified volunteer slots
- ❌ Projects always save with volunteersNeeded = 0

## Technical Notes

### Conditional Rendering Logic
The system now distinguishes between projects and events using `projectDraft.isEvent`:
- **Events** (`isEvent === true`): Show and use volunteer slots field
- **Projects** (`isEvent === false`): Hide volunteer slots, set to 0

### Why Keep volunteersNeeded in Database?
The `volunteersNeeded` field remains in the `Project` type and database schema for:
1. Backward compatibility with existing data
2. Supporting event functionality which still needs it
3. Avoiding extensive database migration

### Related Displays Still Present (For Both Projects and Events)
The following volunteer-related displays remain functional:
- Project/event card badges showing volunteer counts (lines ~3358, 3584, 3745)
- Volunteer join requests in details view
- Volunteer time logs
- Volunteer attendance tracking

## Files Modified
- `screens/ProjectLifecycleScreen.tsx`
  - Made volunteer coverage conditional in hero highlights (~line 5306)
  - Updated caption text for projects (~line 5299)
  - Made volunteer slots input field conditional (~lines 4295-4307)
  - Updated volunteersNeeded calculation in save function (~line 2228)

## Testing Checklist
- ✅ No TypeScript errors
- Test creating a **project** - should NOT show volunteer slots field
- Test creating an **event** - should show volunteer slots field
- Test **project** details - should NOT show volunteer coverage badge
- Test **event** details - should show "Confirmed Team" badge
- Verify projects save with volunteersNeeded = 0
- Verify events save with user-specified volunteersNeeded value
- Check that volunteer participation displays still work for both

## User Impact

### For Projects:
- ❌ No volunteer slots field in creation form
- ❌ No volunteer coverage badge in details
- ✅ Volunteer participation tracking still works

### For Events:
- ✅ Volunteer slots field appears in creation form
- ✅ "Confirmed Team" badge shows in details
- ✅ All volunteer features fully functional

This provides a cleaner UX for projects while maintaining full volunteer management for events!
