# Skill Matching in Volunteer Dashboard

## Overview
Added skill matching indicators to the Volunteer Dashboard's "Available Events" section. Events that match the volunteer's skills now show a green badge with matched skill names.

## What Was Added

### Skill Matching Function
**Location:** `VolunteerDashboardScreen.tsx` lines ~97-142

```typescript
function checkEventSkillMatch(project: Project, volunteer: Volunteer | null): {
  hasMatch: boolean;
  matchedSkills: string[];
}
```

**How it works:**
1. Extracts skill terms from volunteer profile:
   - `volunteer.skills` array
   - `volunteer.skillsDescription` text
   - `volunteer.specialSkills` text

2. Extracts terms from event:
   - Event title
   - Event description
   - Event `skillsNeeded` array
   - Category-specific keywords (e.g., "nutrition", "food", "feeding" for Nutrition category)

3. Finds matching terms (up to 3 matches shown)

4. Returns:
   - `hasMatch`: true if any skills match
   - `matchedSkills`: array of matched skill names

### Category Keywords
Added keyword mappings for better matching:
- **Nutrition**: nutrition, food, feeding, meal, health, diet
- **Education**: education, school, teaching, learning, student, training
- **Livelihood**: livelihood, income, business, employment, skills, work
- **Disaster**: disaster, relief, emergency, response, rescue, recovery

### Visual Indicator
**Location:** `VolunteerDashboardScreen.tsx` lines ~1127-1135

When viewing the "Available Events" list, events with matching skills show a green badge:

```
✨ Skills Match: teaching, community, education
```

**Badge appearance:**
- Green background (#dcfce7)
- Green text (#166534)
- Star icon (✨)
- Shows up to 3 matched skills
- Appears below event title in the list

## User Experience

### Before (No Skill Matching):
```
Available Events
├─ Beach Cleanup Event
├─ Teaching Program
└─ Food Distribution
```
All events look the same - no indication of fit.

### After (With Skill Matching):
```
Available Events
├─ Beach Cleanup Event
│
├─ Teaching Program
│  ✨ Skills Match: teaching, education, community
│
└─ Food Distribution
   ✨ Skills Match: food, nutrition
```
Events that match volunteer's skills are clearly marked!

## Technical Implementation

### 1. Updated Type Definition
Added `skillMatch` field to `DashboardCardPreview` type:
```typescript
type DashboardCardPreview = {
  // ... existing fields
  skillMatch?: {
    hasMatch: boolean;
    matchedSkills: string[];
  };
};
```

### 2. Updated availableEventCards
Modified to include skill matching for each event:
```typescript
const availableEventCards = useMemo<DashboardCardPreview[]>(
  () =>
    availableEvents.map(project => {
      const skillMatch = checkEventSkillMatch(project, volunteerProfile);
      return {
        // ... existing fields
        skillMatch,
      };
    }),
  [availableEvents, volunteerProfile]
);
```

### 3. Added Visual Badge
In the list rendering:
```typescript
{item.skillMatch?.hasMatch && (
  <View style={styles.skillMatchBadge}>
    <MaterialIcons name="stars" size={14} color="#16a34a" />
    <Text style={styles.skillMatchText}>
      Skills Match: {item.skillMatch.matchedSkills.join(', ')}
    </Text>
  </View>
)}
```

### 4. Added Styles
```typescript
skillMatchBadge: {
  marginTop: 6,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#dcfce7',
  paddingVertical: 4,
  paddingHorizontal: 8,
  borderRadius: 6,
  gap: 4,
  alignSelf: 'flex-start',
},
skillMatchText: {
  fontSize: 11,
  fontWeight: '600',
  color: '#166534',
},
```

## Important Notes

### 1. Order Preserved
Events are NOT sorted by skill match. They remain in their original order. The badge is just a visual indicator.

### 2. Only for Available Events
Skill matching only appears in the "Available Events" section, not in:
- Joined Events (you already joined)
- Featured Event
- Joined Projects

### 3. Only for Events
Skill matching is only applied to events (`project.isEvent === true`), not regular projects.

### 4. Requires Volunteer Profile
If volunteer profile is not loaded or doesn't have skills, no badges will appear.

## Example Skill Matching

**Volunteer Profile:**
```
Skills: ["Teaching", "Community Work", "First Aid"]
Skills Description: "Experience in education and disaster response"
```

**Event 1: "Beach Cleanup"**
```
Title: "Beach Cleanup"
Description: "Community cleanup activity"
Skills Needed: ["Community Work"]
Result: ✨ Skills Match: community
```

**Event 2: "Teaching Workshop"**
```
Title: "Educational Workshop for Kids"
Description: "Teaching basic math and reading"
Skills Needed: ["Teaching", "Education"]
Category: Education
Result: ✨ Skills Match: teaching, education
```

**Event 3: "Medical Mission"**
```
Title: "Free Medical Checkup"
Description: "Providing healthcare services"
Skills Needed: ["Medical", "Nursing"]
Result: No badge (no match)
```

## Files Modified
- `screens/VolunteerDashboardScreen.tsx`
  - Added `normalizeWords()` helper (~line 97)
  - Added `unique()` helper (~line 104)
  - Added `CATEGORY_KEYWORDS` mapping (~line 107)
  - Added `checkEventSkillMatch()` function (~line 115)
  - Updated `DashboardCardPreview` type to include `skillMatch` (~line 233)
  - Updated `availableEventCards` to calculate skill matches (~line 644)
  - Added skill match badge in list rendering (~line 1127)
  - Added `skillMatchBadge` and `skillMatchText` styles (~lines 1951-1964)

## Testing Checklist
- ✅ No TypeScript errors
- Create volunteer account with skills (e.g., "Teaching", "Community Work")
- Create event with matching skills needed
- Go to Volunteer Dashboard → Available Events
- Verify matching events show green "Skills Match" badge
- Verify non-matching events don't show badge
- Verify badge shows correct matched skills
- Verify events stay in same order (not sorted)

## Benefits
✅ Volunteers can quickly identify events that match their skills  
✅ Increases volunteer engagement with relevant opportunities  
✅ Reduces time spent browsing irrelevant events  
✅ Maintains flexibility (all events still visible, just highlighted)  
✅ Clear visual feedback with matched skill names  
