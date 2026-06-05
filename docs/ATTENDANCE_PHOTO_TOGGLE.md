# Attendance Photo Toggle Feature

## Feature Added
Attendance photos are now hidden by default and only shown when you click on the volunteer's account card.

## Changes Made

### File: `screens/VolunteerTasksScreen.tsx`

#### 1. Added State Management
```typescript
const [expandedAttendancePhotos, setExpandedAttendancePhotos] = useState<Set<string>>(new Set());
```
- Tracks which volunteer cards have their photos expanded
- Uses a Set for efficient lookup

#### 2. Made Volunteer Card Clickable
- Changed the volunteer header from `<View>` to `<TouchableOpacity>`
- Clicking the card toggles photo visibility
- Added arrow icon (▼/▲) to indicate expandable state

#### 3. Conditional Photo Display
- Photos only render when `isExpanded` is true
- Photo section wrapped in conditional rendering:
  ```typescript
  {isExpanded && (
    <Image source={{ uri: photo }} />
  )}
  ```

## How It Works Now

### Before (Old Behavior)
- ✗ Photo always visible for all volunteers
- ✗ Takes up screen space
- ✗ No way to collapse

### After (New Behavior)
- ✓ Photo hidden by default
- ✓ Click volunteer card to expand/collapse
- ✓ Arrow icon shows expand state (▼ collapsed, ▲ expanded)
- ✓ Each volunteer can be expanded independently
- ✓ Cleaner, more compact view

## User Experience

### Default View (Collapsed)
```
┌─────────────────────────────────────────┐
│ Rainer Astodillo              ✓ Marked  │
│ rainerastodillo7@gmail.com              │
│ Selected day records: 1            ▼    │
├─────────────────────────────────────────┤
│ CONFIRMED AT                            │
│ 6/4/2026, 3:25:17 PM                   │
│ MARKED STATUS                           │
│ Marked by Volunteer Account...         │
│                                         │
│ [Remove Mark Button]                    │
└─────────────────────────────────────────┘
```

### Expanded View (Photo Visible)
```
┌─────────────────────────────────────────┐
│ Rainer Astodillo              ✓ Marked  │
│ rainerastodillo7@gmail.com              │
│ Selected day records: 1            ▲    │
├─────────────────────────────────────────┤
│ CONFIRMED AT                            │
│ 6/4/2026, 3:25:17 PM                   │
│ MARKED STATUS                           │
│ Marked by Volunteer Account...         │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │                                 │    │
│ │    [Attendance Photo]           │    │
│ │                                 │    │
│ └─────────────────────────────────┘    │
│                                         │
│ [Remove Mark Button]                    │
└─────────────────────────────────────────┘
```

## Benefits

### Space Efficiency
- ✓ More volunteers visible on screen
- ✓ Less scrolling needed
- ✓ Cleaner interface

### Better UX
- ✓ Click to view details
- ✓ Visual indicator (arrow)
- ✓ Smooth interaction
- ✓ Independent controls per volunteer

### Performance
- ✓ Images only loaded when needed
- ✓ Reduces initial render time
- ✓ Better memory usage

## Technical Details

### State Structure
```typescript
expandedAttendancePhotos: Set<string>
// Contains volunteer IDs of expanded cards
// Example: Set(['volunteer-123', 'volunteer-456'])
```

### Toggle Logic
```typescript
setExpandedAttendancePhotos(prev => {
  const newSet = new Set(prev);
  if (newSet.has(volunteerId)) {
    newSet.delete(volunteerId);  // Collapse
  } else {
    newSet.add(volunteerId);     // Expand
  }
  return newSet;
});
```

### Visual Indicators
- **Arrow Down (▼)** - Card collapsed, photo hidden
- **Arrow Up (▲)** - Card expanded, photo visible

## Testing Checklist

- [ ] Click volunteer card - photo appears
- [ ] Click again - photo disappears
- [ ] Arrow icon changes direction
- [ ] Multiple volunteers can be expanded independently
- [ ] Photo loads correctly when expanded
- [ ] No photo message shows when no photo available
- [ ] Mark/Remove button still works
- [ ] Smooth animation/transition
- [ ] Works on mobile
- [ ] Works on web

## Location

**File:** `screens/VolunteerTasksScreen.tsx`
**Section:** Managed Event Attendance Review
**Lines:** ~450 (state), ~2227-2310 (UI)

## Related Features

- Attendance marking/unmarking
- Photo upload verification
- Field officer review workflow
- Volunteer task management

---

**Status:** Implemented ✅
**Build Status:** No errors ✅
**Ready for:** Testing
