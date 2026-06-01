# Quick Start Testing Guide

## 🚀 Start the System

1. **Start Backend** (if not already running):
   ```bash
   npm run backend
   ```
   Or for background:
   ```bash
   npm run all:bg
   ```

2. **Start Frontend**:
   ```bash
   npm start
   ```
   Or for web:
   ```bash
   npm run web
   ```

---

## 🔐 Quick Demo Sign In Accounts

All accounts are now in the database and ready to use!

### Admin Account (Web Portal)
- **Email**: `admin@nvc.org`
- **Password**: `admin123`
- **Access**: Full admin dashboard, project management, user approvals

### Volunteer Account (Mobile App)
- **Email**: `volunteer@example.com`
- **Password**: `volunteer123`
- **Access**: Browse events, join events, view profile

### Partner Accounts (Mobile App)
All partners use password: `partner123`

1. **PBSP**: `partnerships@pbsp.org.ph`
2. **Jollibee Foundation**: `partnerships@jollibeefoundation.org`
3. **Kabankalan LGU**: `partner@livelihoods.org`

---

## ✅ What's Working Now

### 1. Automatic Field Officer Tasks
- **What**: Every event automatically gets a "Field Officer" task
- **How to test**:
  1. Log in as admin
  2. Create or edit an event
  3. Check the event's internal tasks
  4. You should see a "Field Officer" task with High priority

### 2. Location Structure
- **Projects**: Only have Region and City
- **Events**: Inherit Region/City from parent, only need Barangay
- **How to test**:
  1. Create a project with Region and City
  2. Create an event under that project
  3. Event form should show Region/City as read-only (inherited)
  4. Only Barangay field is editable for events

### 3. Quick Demo Sign In
- **What**: Pre-configured accounts for instant testing
- **How to test**:
  1. Open login screen
  2. Click any "Quick Demo Sign In" button
  3. Credentials auto-fill and you're logged in

---

## 🧪 Test Scenarios

### Scenario 1: Admin Creates Event with Field Officer
1. Log in as admin (`admin@nvc.org` / `admin123`)
2. Go to Projects/Events section
3. Create a new project:
   - Title: "Community Feeding Program"
   - Region: "National Capital Region (NCR)"
   - City: "Manila"
   - Set dates and other required fields
4. Create an event under that project:
   - Title: "Feeding Day 1"
   - Barangay: Select any barangay
   - Region/City should be auto-filled from parent
5. Save the event
6. Open the event details
7. **Verify**: Event has a "Field Officer" task automatically created

### Scenario 2: Volunteer Joins Event
1. Log in as volunteer (`volunteer@example.com` / `volunteer123`)
2. Browse available events
3. Click "Join" on an event
4. **Verify**: Join request is sent
5. Log out and log in as admin
6. Go to volunteer management or event details
7. Approve the volunteer's join request
8. **Verify**: Volunteer appears in event participants

### Scenario 3: Partner Views Projects
1. Log in as partner (`partnerships@pbsp.org.ph` / `partner123`)
2. Browse available projects
3. View project details
4. **Verify**: Partner can see projects and submit proposals

---

## 🔍 Checking Database Directly

If you need to verify data in the database:

```bash
cd backend
python check_users_schema.py
```

Or check specific data:
```python
python -c "import os; import psycopg2; from dotenv import load_dotenv; load_dotenv(); conn = psycopg2.connect(os.getenv('SUPABASE_DB_URL')); cursor = conn.cursor(); cursor.execute('SELECT email, role FROM users'); print([row for row in cursor.fetchall()])"
```

---

## 📊 Current Database State

- **Users**: 5 demo accounts (1 admin, 1 volunteer, 3 partners)
- **Projects**: Empty (create your own for testing)
- **Events**: Empty (create your own for testing)
- **All accounts**: Approved and ready to log in

---

## 🆘 Troubleshooting

### Can't log in?
- Check backend is running: `npm run backend`
- Check database connection in `.env` file
- Verify accounts exist: `cd backend && python seed_demo_accounts.py`

### Field officer task not appearing?
- Make sure you're creating an EVENT, not a project
- Check the event's `internalTasks` array in the database
- The task should have `isFieldOfficer: true`

### Location not showing correctly?
- Projects should only show Region and City
- Events should show Barangay, City, Region
- Events inherit Region/City from parent project

### Need to reset demo accounts?
```bash
cd backend
python seed_demo_accounts.py
```
This will update existing accounts or create them if missing.

---

## 📝 Notes

- All demo accounts have `approval_status: 'approved'` so they work immediately
- Passwords are stored in plain text for demo purposes (not production-ready)
- The volunteer account can join events but needs admin approval
- Partners can submit project proposals
- Admin has full access to all features

---

## 🎯 Next Development Steps

1. Add more test data (projects, events) for richer testing
2. Test volunteer time logging
3. Test partner proposal submission and approval
4. Test event check-in/attendance
5. Test field officer task assignment
