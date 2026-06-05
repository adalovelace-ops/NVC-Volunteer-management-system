# Event Capacity Validation - Full Slot Prevention

## Overview
The system prevents volunteers from joining events that have reached their volunteer capacity. This validation works at two levels:
1. **Visual feedback** - Join button is disabled when event is full
2. **Backend validation** - Blocks join request even if button is somehow clicked

## How It Works

### 1. Visual Button State (`isJoinDisabled`)

**Location:** `ProjectsScreen.tsx` ~line 1420-1455

The `getVolunteerEventActionState` function calculates whether the join button should be disabled:

```typescript
// Check if event has reached capacity
const volunteersNeeded = project.volunteersNeeded || 0;
const currentVolunteers = project.volunteers?.length || 0;
const pendingJoinRequests = volunteerMatches.filter(
  match => match.projectId === project.id && match.status === 'Requested'
).length;
const approvedJoinRequests = volunteerJoinRecords.filter(
  record => record.projectId === project.id
).length;
const totalSlotsTaken = currentVolunteers + pendingJoinRequests + approvedJoinRequests;
const isEventFull = project.isEvent && volunteersNeeded > 0 && totalSlotsTaken >= volunteersNeeded;

const isJoinDisabled =
  joined || completedParticipation || isPendingApproval || isClosedStatus || isOnHold || isEventFull;
```

**What it checks:**
- Current volunteers already in the event
- Pending join requests (not yet approved)
- Approved join records
- If total slots taken ≥ volunteers needed, event is full

**Result:**
- ✅ Join button is **disabled** (grayed out)
- ✅ Status message shows: "This event has reached volunteer capacity."

### 2. Backend Validation (`handleJoinProject`)

**Location:** `ProjectsScreen.tsx` ~line 684-730

Even if the button is somehow clicked, the function validates before making the API call:

```typescript
// Check if event is full before allowing join
if (selectedProject.isEvent) {
  const volunteersNeeded = selectedProject.volunteersNeeded || 0;
  const currentVolunteers = selectedProject.volunteers?.length || 0;
  const pendingJoinRequests = volunteerMatches.filter(
    match => match.projectId === projectId && match.status === 'Requested'
  ).length;
  const approvedJoinRequests = volunteerJoinRecords.filter(
    record => record.projectId === projectId
  ).length;
  
  const totalSlotsTaken = currentVolunteers + pendingJoinRequests + approvedJoinRequests;
  
  if (totalSlotsTaken >= volunteersNeeded && volunteersNeeded > 0) {
    Alert.alert(
      'Event Full',
      'This event has reached its volunteer capacity. All slots are filled.'
    );
    return;
  }
}
```

**Result:**
- ✅ Shows alert: "Event Full - This event has reached its volunteer capacity. All slots are filled."
- ✅ Prevents API call from being made
- ✅ Volunteer cannot join

## Slot Calculation Logic

The system counts all slots that are taken or reserved:

1. **Current Volunteers** (`project.volunteers.length`)
   - Volunteers who are already confirmed members

2. **Pending Join Requests** (`volunteerMatches` with status `'Requested'`)
   - Volunteers who requested to join but admin hasn't approved/rejected yet
   - These "reserve" a slot to prevent over-booking

3. **Approved Join Records** (`volunteerJoinRecords`)
   - Volunteers who have been approved but may not be in volunteers array yet

**Total Slots Taken** = Current Volunteers + Pending Requests + Approved Records

**Event is Full when:** Total Slots Taken ≥ Volunteers Needed (and Volunteers Needed > 0)

## Special Cases

### Case 1: volunteersNeeded = 0
If `volunteersNeeded` is 0 (e.g., for projects where slots were removed):
- Event is **never considered full**
- Unlimited volunteers can join
- This is intentional for projects that don't need slot management

### Case 2: Pending Requests Count Toward Capacity
Pending requests reserve slots to prevent race conditions:
- Example: Event has 10 slots, 8 volunteers, 2 pending requests
- Total slots taken = 10, so event is full
- New volunteers cannot request until admin approves/rejects pending requests

### Case 3: Real-time Updates
When admin approves/rejects requests:
- Storage change event triggers re-render
- Slot calculation updates automatically
- Button state refreshes

## User Experience

### When Event Has Slots Available:
- ✅ "Request to Join" button is **enabled** (green)
- Shows: "X spots left" in event card
- Status: "Open for volunteer requests."

### When Event is Full:
- ❌ "Request to Join" button is **disabled** (grayed out)
- Shows: "Volunteer slots full" in event card
- Status: "This event has reached volunteer capacity."

### When Volunteer Clicks Disabled Button:
- Nothing happens (button is disabled)

### If Button Validation is Bypassed Somehow:
- Shows alert: "Event Full"
- Prevents join request from being sent

## Related Functions

### Display Functions
- `getEventAvailabilitySummary()` - Shows "X spots left" or "Volunteer slots full"
- `getVolunteerEventActionState()` - Calculates button state and status message

### Action Functions
- `handleJoinProject()` - Validates and processes join request

## Files Modified
- `screens/ProjectsScreen.tsx`
  - Enhanced `getVolunteerEventActionState()` to check event capacity (~line 1420)
  - Added `isEventFull` check to `isJoinDisabled` (~line 1455)
  - Updated status message to show capacity message (~line 1445)
  - Backend validation already exists in `handleJoinProject()` (~line 693)

## Testing Checklist
- ✅ No TypeScript errors
- Create event with 2 volunteer slots
- Have 2 volunteers request to join (both pending)
- Third volunteer should see "Event Full" / disabled button
- Admin approves 1 request
- Third volunteer should still see full (1 approved + 1 pending = 2 slots)
- Admin rejects 1 pending request
- Third volunteer should now be able to request (1 slot open)

## Why This Matters
Without this validation:
- ❌ Events could be over-booked
- ❌ More volunteers might show up than the event can handle
- ❌ Poor user experience (joining but getting rejected)

With this validation:
- ✅ Events maintain proper capacity
- ✅ Clear feedback to volunteers
- ✅ Prevents wasted effort requesting full events
- ✅ Admin doesn't have to manually reject overflow requests
