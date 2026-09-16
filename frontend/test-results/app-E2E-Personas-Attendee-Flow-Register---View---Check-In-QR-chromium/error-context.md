# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.js >> E2E Personas >> Attendee Flow: Register -> View -> Check-In QR
- Location: tests\e2e\app.spec.js:8:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Welcome back')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Welcome back')

```

```yaml
- banner:
  - link "Event Intelligence Platform":
    - /url: /
  - navigation:
    - link "Log in":
      - /url: /login
    - link "Sign up":
      - /url: /register
- main:
  - heading "Log in" [level=1]
  - text: Email
  - textbox
  - text: Password
  - textbox
  - button "Log in"
  - paragraph:
    - text: No account?
    - link "Sign up":
      - /url: /register
  - paragraph: "Demo: organizer@demo.test / attendee@demo.test — password Demo1234! (after running the seed script)"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('E2E Personas', () => {
  4  |   // Normally we would seed a test database and boot the backend + frontend.
  5  |   // For this milestone, we write the structure and mock API calls if needed, 
  6  |   // or point to localhost:5173 assuming the dev server is running.
  7  |   
  8  |   test('Attendee Flow: Register -> View -> Check-In QR', async ({ page }) => {
  9  |     // 1. Visit Login
  10 |     await page.goto('http://localhost:5173/login');
  11 |     // Ensure page loaded
> 12 |     await expect(page.locator('text=Welcome back')).toBeVisible();
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  13 |     
  14 |     // We mock the user or use a seeded user.
  15 |     // Given no running environment in this CI, we'll just check if the app mounts.
  16 |   });
  17 | 
  18 |   test('Organizer Flow: Dashboard -> Intelligence -> Alerts', async ({ page }) => {
  19 |     await page.goto('http://localhost:5173/login');
  20 |     // ...
  21 |   });
  22 | 
  23 |   test('Executive Flow: Executive Dashboard -> Risks -> Assistant', async ({ page }) => {
  24 |     await page.goto('http://localhost:5173/executive');
  25 |     // ...
  26 |   });
  27 | });
  28 | 
```