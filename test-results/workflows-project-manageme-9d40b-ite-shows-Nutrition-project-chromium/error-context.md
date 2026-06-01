# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflows\project-management-suite-visibility.spec.ts >> PM-UI-1: Admin web project management suite shows Nutrition project
- Location: tests\e2e\workflows\project-management-suite-visibility.spec.ts:21:5

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
            - generic [ref=e95]:
              - generic [ref=e97]: 
              - generic [ref=e98]:
                - generic [ref=e99]: DISASTER TEST PROGRAM Projects
                - generic [ref=e100]: 1 project in this program.
            - generic [ref=e101] [cursor=pointer]:
              - generic [ref=e102]: 
              - generic [ref=e103]: Create Project
          - generic [ref=e107] [cursor=pointer]:
            - generic [ref=e108]:
              - generic [ref=e110]: 
              - generic [ref=e112]: In Progress
            - generic [ref=e113]: DISASTER TEST PROJECT
            - generic [ref=e114]: Jun 1, 2:29 AM - Jun 8, 2:29 AM
            - generic [ref=e115]: 0/20 volunteers
            - generic [ref=e116]:
              - generic [ref=e118]: 
              - generic [ref=e120]: 
        - generic [ref=e123]:
          - generic [ref=e124]:
            - generic [ref=e125]:
              - generic [ref=e127]: 
              - generic [ref=e128]:
                - generic [ref=e129]: Final Test Program Projects
                - generic [ref=e130]: 1 project in this program.
            - generic [ref=e131] [cursor=pointer]:
              - generic [ref=e132]: 
              - generic [ref=e133]: Create Project
          - generic [ref=e137] [cursor=pointer]:
            - generic [ref=e138]:
              - generic [ref=e140]: 
              - generic [ref=e142]: In Progress
            - generic [ref=e143]: Nutrition Test Project
            - generic [ref=e144]: Jun 1, 8:06 AM - Jun 8, 8:06 AM
            - generic [ref=e145]: 0/20 volunteers
            - generic [ref=e146]:
              - generic [ref=e148]: 
              - generic [ref=e150]: 
      - generic [ref=e151]:
        - generic [ref=e152]:
          - generic [ref=e153]: Projects
          - generic [ref=e154]: One shared list for all projects in the system.
          - generic [ref=e156]: May 31 - Jul 11, 2026
          - generic [ref=e157] [cursor=pointer]:
            - generic [ref=e158]: Nutrition Project Proposal
            - generic [ref=e159]: May 31, 8:00 AM
          - generic [ref=e160] [cursor=pointer]:
            - generic [ref=e161]: Final Test Program
            - generic [ref=e162]: Jun 1, 2:04 AM
          - generic [ref=e163] [cursor=pointer]:
            - generic [ref=e164]: DISASTER TEST PROGRAM
            - generic [ref=e165]: Jun 1, 2:28 AM
          - generic [ref=e166] [cursor=pointer]:
            - generic [ref=e167]: DISASTER TEST PROJECT
            - generic [ref=e168]: Jun 1, 2:29 AM - Jun 8, 2:29 AM
          - generic [ref=e169] [cursor=pointer]:
            - generic [ref=e170]: Nutrition Test Project
            - generic [ref=e171]: Jun 1, 8:06 AM - Jun 8, 8:06 AM
        - generic [ref=e172]:
          - generic [ref=e173]:
            - generic [ref=e174]:
              - generic [ref=e175]: Today
              - generic [ref=e176]: Monday, June 1
            - generic [ref=e178]:
              - generic [ref=e180] [cursor=pointer]: 
              - generic [ref=e181]: June 2026
              - generic [ref=e183] [cursor=pointer]: 
          - generic [ref=e185] [cursor=pointer]: June 2026
          - generic [ref=e188]:
            - generic [ref=e189]:
              - generic [ref=e190]: Sun
              - generic [ref=e191]: Mon
              - generic [ref=e192]: Tue
              - generic [ref=e193]: Wed
              - generic [ref=e194]: Thu
              - generic [ref=e195]: Fri
              - generic [ref=e196]: Sat
            - generic [ref=e197]:
              - generic [ref=e198]:
                - generic [ref=e200]: "31"
                - generic [ref=e202]: Nutrition Project Proposal
              - generic [ref=e203]:
                - generic [ref=e204]:
                  - generic [ref=e205]: "1"
                  - generic [ref=e206]: Today
                - generic [ref=e208]: Nutrition Test Project
                - generic [ref=e210]: DISASTER TEST PROJECT
                - generic [ref=e212]: DISASTER TEST PROGRAM
                - generic [ref=e214]: Final Test Program
              - generic [ref=e217]: "2"
              - generic [ref=e220]: "3"
              - generic [ref=e223]: "4"
              - generic [ref=e226]: "5"
              - generic [ref=e229]: "6"
            - generic [ref=e230]:
              - generic [ref=e233]: "7"
              - generic [ref=e236]: "8"
              - generic [ref=e239]: "9"
              - generic [ref=e242]: "10"
              - generic [ref=e245]: "11"
              - generic [ref=e248]: "12"
              - generic [ref=e251]: "13"
            - generic [ref=e252]:
              - generic [ref=e255]: "14"
              - generic [ref=e258]: "15"
              - generic [ref=e261]: "16"
              - generic [ref=e264]: "17"
              - generic [ref=e267]: "18"
              - generic [ref=e270]: "19"
              - generic [ref=e273]: "20"
            - generic [ref=e274]:
              - generic [ref=e277]: "21"
              - generic [ref=e280]: "22"
              - generic [ref=e283]: "23"
              - generic [ref=e286]: "24"
              - generic [ref=e289]: "25"
              - generic [ref=e292]: "26"
              - generic [ref=e295]: "27"
            - generic [ref=e296]:
              - generic [ref=e299]: "28"
              - generic [ref=e302]: "29"
              - generic [ref=e305]: "30"
              - generic [ref=e308]: "1"
              - generic [ref=e311]: "2"
              - generic [ref=e314]: "3"
              - generic [ref=e317]: "4"
            - generic [ref=e318]:
              - generic [ref=e321]: "5"
              - generic [ref=e324]: "6"
              - generic [ref=e327]: "7"
              - generic [ref=e330]: "8"
              - generic [ref=e333]: "9"
              - generic [ref=e336]: "10"
              - generic [ref=e339]: "11"
          - generic [ref=e340]:
            - generic [ref=e341]:
              - generic [ref=e342]:
                - generic [ref=e343]: Project Calendar
                - generic [ref=e344]: All project cards in the system
              - generic [ref=e345]: 5 projects
            - generic [ref=e346]:
              - generic [ref=e347] [cursor=pointer]:
                - generic [ref=e349]: Nutrition Project Proposal
                - generic [ref=e351]: May 31, 8:00 AM
                - generic [ref=e352]: Nutrition
              - generic [ref=e353] [cursor=pointer]:
                - generic [ref=e355]: Final Test Program
                - generic [ref=e357]: Jun 1, 2:04 AM
                - generic [ref=e358]: Education
              - generic [ref=e359] [cursor=pointer]:
                - generic [ref=e361]: DISASTER TEST PROGRAM
                - generic [ref=e363]: Jun 1, 2:28 AM
                - generic [ref=e364]: DISASTER TEST PROGRAM
              - generic [ref=e365] [cursor=pointer]:
                - generic [ref=e367]: DISASTER TEST PROJECT
                - generic [ref=e369]: Jun 1, 2:29 AM - Jun 8, 2:29 AM
                - generic [ref=e370]: program:DISASTERTESTPROGRAM
              - generic [ref=e371] [cursor=pointer]:
                - generic [ref=e373]: Nutrition Test Project
                - generic [ref=e375]: Jun 1, 8:06 AM - Jun 8, 8:06 AM
                - generic [ref=e376]: program:FinalTest
    - generic [ref=e379]:
      - generic [ref=e386]:
        - generic [ref=e387]: NVC
        - generic [ref=e388]: Program Management Suite
      - generic [ref=e390] [cursor=pointer]: 
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