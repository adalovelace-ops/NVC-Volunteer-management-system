# NVC CONNECT – Quick Reference

## Start the System

```powershell
# Start everything (backend + expo web)
npm start

# Or start individually:
npm run backend          # Backend API  → http://127.0.0.1:8000
npm run expo:web         # Admin web UI → http://localhost:8081
```

---

## Login Credentials

| Role | Email | Password | Portal |
|------|-------|----------|--------|
| Admin | admin@nvc.org | admin123 | http://localhost:8081 |
| Volunteer | volunteer@example.com | volunteer123 | Mobile app or http://localhost:8081/?mode=mobile |
| Partner (Jollibee) | partnerships@jollibeefoundation.org | partner123 | Mobile app or http://localhost:8081/?mode=mobile |
| Partner (PBSP) | partnerships@pbsp.org.ph | partner123 | Mobile app or http://localhost:8081/?mode=mobile |
| Partner (Livelihood) | partner@livelihoods.org | partner123 | Mobile app or http://localhost:8081/?mode=mobile |

---

## Open in Browser

```powershell
npm run open:admin      # Admin web portal  → http://localhost:8081
npm run open:mobile     # Mobile UI in browser → http://localhost:8081/?mode=mobile
```

> **?mode=mobile** enables the full volunteer/partner mobile UI in any browser.
> Volunteer and partner accounts can log in, see role selection cards, and access their dashboards.

---

## Run Playwright Tests

```powershell
# Run all 56 tests (headless, fast)
npm run test:e2e

# Watch tests live in a real browser (headed, 700ms slowmo)
npm run test:e2e:watch

# Watch by role
npm run test:e2e:watch:admin       # Admin UI tests
npm run test:e2e:watch:volunteer   # Volunteer tests
npm run test:e2e:watch:partner     # Partner tests
npm run test:e2e:watch:cross       # Cross-role flow tests

# Open Playwright interactive UI
npm run test:e2e:ui

# View last test report
npm run test:e2e:report
```

> **Before running tests**: make sure backend (port 8000) and expo web (port 8081) are running.

---

## Database

- **Provider**: Supabase PostgreSQL
- **Region**: Singapore (ap-southeast-1)
- **Connection**: Set in `.env` → `SUPABASE_DB_URL`

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/api.py` | All API endpoints (36+ routes) |
| `backend/relational_mirror.py` | DB schema mapping (non-standard PKs) |
| `models/storage.ts` | Frontend data access layer |
| `contexts/AuthContext.tsx` | Auth state + mobile mode logic |
| `screens/LoginScreen.tsx` | Login + signup UI |
| `navigation/AdminNavigator.tsx` | Admin tab navigation |
| `navigation/VolunteerNavigator.tsx` | Volunteer tab navigation |
| `navigation/PartnerNavigator.tsx` | Partner tab navigation |
| `tests/e2e/workflows/` | All Playwright E2E tests |
| `.env` | Environment variables |

---

## Test Coverage (56 tests)

| Suite | Tests | Coverage |
|-------|-------|----------|
| admin.spec.ts | 15 | Admin web portal UI + all API functions |
| volunteer.spec.ts | 16 | Volunteer API + mobile UI in browser |
| partner.spec.ts | 17 | Partner API + mobile UI in browser |
| cross-role.spec.ts | 8 | End-to-end flows across all roles |

---

## Troubleshooting

```powershell
# Port 8000 already in use?
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Clear expo cache
npx expo start --web --clear

# Restart backend
npm run backend
```
