# Proposal and Program Deletion Fixes

## Issues to Fix

### Issue 1: Partner Proposal Messages Disappearing
**Problem**: When admin approves/rejects a proposal, the original partner message disappears from the conversation. It should stay as history.

**Root Cause**: The frontend code only patches messages for "Approved" status, not "Rejected". When `loadMessages()` is called, it should reload all messages including the original, but something is filtering them out.

**Status**: Added debugging to track the issue

### Issue 2: Proposal Approval Not Working  
**Problem**: When admin clicks "Approve", nothing happens - proposal stays "Pending" and project is not created.

**Root Cause**: Unknown - backend code looks correct and creates the project. Need to test with debugging.

**Status**: Added comprehensive debugging logs to track:
- Application ID
- API call
- Response
- Project creation
- Message patching
- Data reloading

### Issue 3: Cannot Delete Programs
**Problem**: Clicking delete button on programs (DISASTER, Nutrition, Education, Livelihood, Disaster) does nothing.

**Root Cause**: Unknown - both frontend and backend code look correct.

**Status**: Added debugging logs to track:
- Track ID
- Delete API call
- Success/failure
- Reload

## Changes Made

### 1. CommunicationHubScreen.tsx
**Added debugging to `handleReview` function** (lines 1995-2120):
- Logs application ID, status, user ID
- Logs API call and response
- Logs project ID from response
- Logs message patching for Approved status
- Logs data reload
- Tracks if messages are being filtered

### 2. ProjectLifecycleScreen.tsx  
**Added debugging to `handleDeleteProgram` function** (lines 1333-1370):
- Logs track ID and title
- Logs API call
- Logs success/failure
- Logs reload

## Testing Instructions

### Test Proposal Approval:
1. **Start backend**: `npm start`
2. **Login as partner** (partner@example.com / partner123)
3. **Send a proposal** through Messages
4. **Login as admin** (admin@example.com / admin123)
5. **Open Messages** → Proposals tab
6. **Click "Approve Proposal"**
7. **Open browser console** (F12)
8. **Check console logs**:
   - Should see "=== PROPOSAL REVIEW DEBUG ==="
   - Should see API call and response
   - Should see project ID
   - Should see "Data reloaded successfully"
9. **Check if**:
   - Original partner message is still visible
   - New approval card appears
   - Project is created in Program Management Suite
   - Proposal status changes from "Pending"

### Test Proposal Rejection:
1. **Send another proposal** as partner
2. **Login as admin**
3. **Click "Reject Proposal"**
4. **Check console logs**
5. **Check if**:
   - Original partner message is still visible
   - New rejection card appears
   - Proposal is removed from pending list

### Test Program Deletion:
1. **Login as admin**
2. **Go to Program Management Suite**
3. **Click delete icon** on any program (DISASTER, Nutrition, etc.)
4. **Confirm deletion**
5. **Open browser console** (F12)
6. **Check console logs**:
   - Should see "=== DELETE PROGRAM DEBUG ==="
   - Should see "Calling deleteProgram API..."
   - Should see "Delete API call successful"
   - Should see "Program tracks reloaded"
7. **Check if**:
   - Program disappears from list
   - Success alert appears
   - Page reloads correctly

## Expected Console Output

### Successful Proposal Approval:
```
=== PROPOSAL REVIEW DEBUG ===
Application ID: app-xxxxx
Status: Approved
User ID: user-admin-xxxxx
Calling reviewPartnerProjectApplication API...
API Response: {id: "app-xxxxx", status: "Approved", projectId: "project-proposal-xxxxx"}
Project ID: project-proposal-xxxxx
Patching messages for Approved status...
Found matching message to patch: msg-xxxxx
Reloading data...
Data reloaded successfully
```

### Successful Program Deletion:
```
=== DELETE PROGRAM DEBUG ===
Track ID: DISASTER
Track Title: DISASTER
Starting deletion...
Calling deleteProgram API...
Delete API call successful
Program tracks reloaded
```

## Next Steps

1. **Run the tests** above and share console output
2. **If approval fails**: Check API response for errors
3. **If deletion fails**: Check if confirmation dialog appears
4. **If messages disappear**: Check if `loadMessages()` is filtering proposal cards

## Backend Verification

The backend endpoints are correct:
- ✅ `/partner-project-applications/{id}/review` - Creates project and sends review card
- ✅ `/program-tracks/{id}` DELETE - Deletes program and cascades to projects/events

Both endpoints commit changes and broadcast storage events.
