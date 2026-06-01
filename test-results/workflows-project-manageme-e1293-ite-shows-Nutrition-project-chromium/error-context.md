# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflows\project-management-suite-visibility.spec.ts >> PM-UI-2: Admin narrow-width project management suite shows Nutrition project
- Location: tests\e2e\workflows\project-management-suite-visibility.spec.ts:27:5

# Error details

```
TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('#program-suite-popup button').filter({ hasText: 'Projects' }) to be visible

```

# Page snapshot

```yaml
- generic [ref=e9]:
  - generic [ref=e11]:
    - generic [ref=e13] [cursor=pointer]: 
    - generic [ref=e15]:
      - generic [ref=e19] [cursor=pointer]: 
      - generic [ref=e23] [cursor=pointer]: 
      - generic [ref=e27] [cursor=pointer]: 
      - generic [ref=e31] [cursor=pointer]: 
      - generic [ref=e35] [cursor=pointer]: 
      - generic [ref=e39] [cursor=pointer]: 
      - generic [ref=e44] [cursor=pointer]: 
      - generic [ref=e48] [cursor=pointer]: 
      - generic [ref=e52] [cursor=pointer]: 
      - generic [ref=e56] [cursor=pointer]: 
      - generic [ref=e60] [cursor=pointer]: 
  - generic [ref=e65]:
    - generic [ref=e69]:
      - generic [ref=e71]:
        - generic [ref=e72]: Lifecycle workspace
        - generic [ref=e73]: Program Management Suite
        - generic [ref=e74]: Open the active programs below and manage each scheduler, project list, volunteers, and approvals in one place.
      - generic [ref=e75]:
        - generic [ref=e76]: Projects
        - generic [ref=e77]:
          - generic [ref=e78] [cursor=pointer]:
            - generic [ref=e79]: "4"
            - generic [ref=e80]: In Progress
          - generic [ref=e81] [cursor=pointer]:
            - generic [ref=e82]: "0"
            - generic [ref=e83]: Planning
          - generic [ref=e84] [cursor=pointer]:
            - generic [ref=e85]: "1"
            - generic [ref=e86]: Completed
          - generic [ref=e87] [cursor=pointer]:
            - generic [ref=e88]: "0"
            - generic [ref=e89]: Cancelled
      - generic [ref=e90]:
        - generic [ref=e93]:
          - generic [ref=e94]:
            - generic:
              - generic [ref=e96]: 
              - generic:
                - generic: DISASTER TEST PROGRAM Projects
                - generic: 1 project in this program.
            - generic [ref=e97] [cursor=pointer]:
              - generic [ref=e98]: 
              - generic [ref=e99]: Create Project
          - generic [ref=e103] [cursor=pointer]:
            - generic [ref=e104]:
              - generic [ref=e106]: 
              - generic [ref=e108]: In Progress
            - generic [ref=e109]: DISASTER TEST PROJECT
            - generic [ref=e110]: Jun 1, 2:29 AM - Jun 8, 2:29 AM
            - generic [ref=e111]: 0/20 volunteers
            - generic [ref=e112]:
              - generic [ref=e114]: 
              - generic [ref=e116]: 
        - generic [ref=e119]:
          - generic [ref=e120]:
            - generic:
              - generic [ref=e122]: 
              - generic:
                - generic: Final Test Program Projects
                - generic: 1 project in this program.
            - generic [ref=e123] [cursor=pointer]:
              - generic [ref=e124]: 
              - generic [ref=e125]: Create Project
          - generic [ref=e129] [cursor=pointer]:
            - generic [ref=e130]:
              - generic [ref=e132]: 
              - generic [ref=e134]: In Progress
            - generic [ref=e135]: Nutrition Test Project
            - generic [ref=e136]: Jun 1, 8:06 AM - Jun 8, 8:06 AM
            - generic [ref=e137]: 0/20 volunteers
            - generic [ref=e138]:
              - generic [ref=e140]: 
              - generic [ref=e142]: 
      - generic [ref=e143]:
        - generic [ref=e144]:
          - generic [ref=e145]: Projects
          - generic [ref=e146]: One shared list for all projects in the system.
          - generic [ref=e148]: May 31 - Jul 11, 2026
          - generic [ref=e149] [cursor=pointer]:
            - generic [ref=e150]: Nutrition Project Proposal
            - generic [ref=e151]: May 31, 8:00 AM
          - generic [ref=e152] [cursor=pointer]:
            - generic [ref=e153]: Final Test Program
            - generic [ref=e154]: Jun 1, 2:04 AM
          - generic [ref=e155] [cursor=pointer]:
            - generic [ref=e156]: DISASTER TEST PROGRAM
            - generic [ref=e157]: Jun 1, 2:28 AM
          - generic [ref=e158] [cursor=pointer]:
            - generic [ref=e159]: DISASTER TEST PROJECT
            - generic [ref=e160]: Jun 1, 2:29 AM - Jun 8, 2:29 AM
          - generic [ref=e161] [cursor=pointer]:
            - generic [ref=e162]: Nutrition Test Project
            - generic [ref=e163]: Jun 1, 8:06 AM - Jun 8, 8:06 AM
        - generic [ref=e164]:
          - generic:
            - generic [ref=e165]:
              - generic [ref=e166]: Today
              - generic [ref=e167]: Monday, June 1
            - generic [ref=e169]:
              - generic [ref=e171] [cursor=pointer]: 
              - generic [ref=e172]: June 2026
              - generic [ref=e174] [cursor=pointer]: 
          - generic [ref=e176] [cursor=pointer]: June 2026
          - generic [ref=e178]:
            - generic [ref=e179]:
              - generic [ref=e180]: Sun
              - generic [ref=e181]: Mon
              - generic [ref=e182]: Tue
              - generic [ref=e183]: Wed
              - generic [ref=e184]: Thu
              - generic [ref=e185]: Fri
              - generic [ref=e186]: Sat
            - generic [ref=e187]:
              - generic [ref=e188]:
                - generic [ref=e190]: "31"
                - generic [ref=e192]: Nutrition Project Proposal
              - generic [ref=e193]:
                - generic [ref=e194]:
                  - generic [ref=e195]: "1"
                  - generic [ref=e196]: Today
                - generic [ref=e198]: Nutrition Test Project
                - generic [ref=e200]: DISASTER TEST PROJECT
                - generic [ref=e202]: DISASTER TEST PROGRAM
                - generic [ref=e204]: Final Test Program
              - generic [ref=e207]: "2"
              - generic [ref=e210]: "3"
              - generic [ref=e213]: "4"
              - generic [ref=e216]: "5"
              - generic [ref=e219]: "6"
            - generic [ref=e220]:
              - generic [ref=e223]: "7"
              - generic [ref=e226]: "8"
              - generic [ref=e229]: "9"
              - generic [ref=e232]: "10"
              - generic [ref=e235]: "11"
              - generic [ref=e238]: "12"
              - generic [ref=e241]: "13"
            - generic [ref=e242]:
              - generic [ref=e245]: "14"
              - generic [ref=e248]: "15"
              - generic [ref=e251]: "16"
              - generic [ref=e254]: "17"
              - generic [ref=e257]: "18"
              - generic [ref=e260]: "19"
              - generic [ref=e263]: "20"
            - generic [ref=e264]:
              - generic [ref=e267]: "21"
              - generic [ref=e270]: "22"
              - generic [ref=e273]: "23"
              - generic [ref=e276]: "24"
              - generic [ref=e279]: "25"
              - generic [ref=e282]: "26"
              - generic [ref=e285]: "27"
            - generic [ref=e286]:
              - generic [ref=e289]: "28"
              - generic [ref=e292]: "29"
              - generic [ref=e295]: "30"
              - generic [ref=e298]: "1"
              - generic [ref=e301]: "2"
              - generic [ref=e304]: "3"
              - generic [ref=e307]: "4"
            - generic [ref=e308]:
              - generic [ref=e311]: "5"
              - generic [ref=e314]: "6"
              - generic [ref=e317]: "7"
              - generic [ref=e320]: "8"
              - generic [ref=e323]: "9"
              - generic [ref=e326]: "10"
              - generic [ref=e329]: "11"
          - generic:
            - generic:
              - generic [ref=e330]:
                - generic [ref=e331]: Project Calendar
                - generic [ref=e332]: All project cards in the system
              - generic [ref=e333]: 5 projects
            - generic:
              - generic [ref=e334] [cursor=pointer]:
                - generic [ref=e336]: Nutrition Project Proposal
                - generic [ref=e338]: May 31, 8:00 AM
                - generic [ref=e339]: Nutrition
              - generic [ref=e340] [cursor=pointer]:
                - generic [ref=e342]: Final Test Program
                - generic [ref=e344]: Jun 1, 2:04 AM
                - generic [ref=e345]: Education
              - generic [ref=e346] [cursor=pointer]:
                - generic [ref=e348]: DISASTER TEST PROGRAM
                - generic [ref=e350]: Jun 1, 2:28 AM
                - generic [ref=e351]: DISASTER TEST PROGRAM
              - generic [ref=e352] [cursor=pointer]:
                - generic [ref=e354]: DISASTER TEST PROJECT
                - generic [ref=e356]: Jun 1, 2:29 AM - Jun 8, 2:29 AM
                - generic [ref=e357]: program:DISASTERTESTPROGRAM
              - generic [ref=e358] [cursor=pointer]:
                - generic [ref=e360]: Nutrition Test Project
                - generic [ref=e362]: Jun 1, 8:06 AM - Jun 8, 8:06 AM
                - generic [ref=e363]: program:FinalTest
    - generic [ref=e366]:
      - generic:
        - generic: NVC
        - generic: Program Management Suite
      - generic [ref=e374] [cursor=pointer]: 
```

# Test source

```ts
  1  | import { Page, test, expect } from '@playwright/test';
  2  | import {
  3  |   loginAsAdmin,
  4  |   waitForPageReady,
  5  |   waitForBackendOnline,
  6  |   assertPageContains,
  7  | } from '../helpers/ui.helper';
  8  | import { ADMIN } from '../helpers/data.helper';
  9  | 
  10 | const EXPECTED_PROJECT_TITLE = /Nutrition Project Proposal/i;
  11 | 
  12 | async function openAdminProjects(page: Page) {
  13 |   const projectsNav = page.getByText('Projects').first();
  14 |   await projectsNav.click();
  15 |   const popupButton = page.locator('#program-suite-popup button', { hasText: 'Projects' });
> 16 |   await popupButton.waitFor({ state: 'visible', timeout: 5000 });
     |                     ^ TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
  17 |   await popupButton.click();
  18 |   await waitForPageReady(page);
  19 | }
  20 | 
  21 | test('PM-UI-1: Admin web project management suite shows Nutrition project', async ({ page }) => {
  22 |   await loginAsAdmin(page, ADMIN.email, ADMIN.password);
  23 |   await openAdminProjects(page);
  24 |   await assertPageContains(page, EXPECTED_PROJECT_TITLE);
  25 | });
  26 | 
  27 | test('PM-UI-2: Admin narrow-width project management suite shows Nutrition project', async ({ page }) => {
  28 |   await page.setViewportSize({ width: 420, height: 900 });
  29 |   await loginAsAdmin(page, ADMIN.email, ADMIN.password);
  30 |   await openAdminProjects(page);
  31 |   await assertPageContains(page, EXPECTED_PROJECT_TITLE);
  32 | });
  33 | 
```