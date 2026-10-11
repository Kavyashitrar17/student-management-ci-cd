# Demonstration Guide (5-7 minutes)

**Before you start (10 minutes earlier):**
- Open your Render URL once so the free service is awake (it sleeps after 15 minutes idle).
- Have these tabs open: (1) your live Render URL, (2) GitHub repo, (3) GitHub **Actions** tab, (4) Render dashboard -> your service, (5) Atlas dashboard (optional), (6) VS Code with the project, PowerShell open in the project folder.
- Make sure the latest commit is green on GitHub and deployed on Render.
- Rehearse the "failing test" part (Step 5) once beforehand and note what Render's Events tab shows.

## Script

### 1. Introduction (0:00 - 0:40)
**Say:** "My project is an automated CI/CD pipeline for a Student Management System. A developer pushes code to GitHub; GitHub Actions automatically tests it; if the tests pass, Render automatically deploys it to a public HTTPS URL, and data is stored in MongoDB Atlas."
**Show:** `ARCHITECTURE.md` diagram (GitHub preview renders it), or the diagram in VS Code preview.

### 2. Live application (0:40 - 2:30)
**Open:** the Render URL (note the padlock/HTTPS).
**Click, saying what you do:**
1. Point at the sidebar status: "Server and database online" and the statistics cards.
2. **Add student** -> fill in Name, Roll number `DEMO-01`, Email, Course, Semester -> **Save**. "Success message shown; total updates."
3. **Add student** again with roll number `demo-01` -> error "roll number already exists" (duplicate prevention). **Cancel**.
4. Type `demo` in the **search** box -> the table filters.
5. **Edit** the row -> change the semester -> **Save**.
6. **Delete** -> confirmation dialog -> **Delete**.
7. Open `<your-url>/health` in a new tab: "Health endpoint reports app and database status."
**Evidence to capture:** screenshots of the dashboard, the success message, the duplicate error, the `/health` JSON.

### 3. Automated tests locally (2:30 - 3:15)
**Run in PowerShell:**
```powershell
npm test
```
**Say:** "19 tests: health check, CRUD, validation, duplicate roll numbers, 404, database errors. They use an in-memory fake database, so no production data is touched. One real-database test is skipped locally and runs in CI."
**Evidence:** screenshot of `# pass 18`, `# fail 0`.

### 4. GitHub Actions (3:15 - 4:15)
**Show:** repo -> **Actions** -> latest **CI** run -> click into the job -> expand "Install dependencies" (`npm ci`) and "Run automated tests".
**Show:** `.github/workflows/ci.yml` and point at `on: push / pull_request`, `npm ci`, `npm test`.
**Say:** "CI is automated testing on every push and pull request. Pull requests are tested but never deployed."
**Evidence:** screenshot of the green run.

### 5. Failed tests block deployment (4:15 - 5:45)
Option A (live, if time): in VS Code change `assert.equal(res.status, 200)` to `201` in `tests/health.test.js`, then:
```powershell
git add .
git commit -m "Demo: deliberately failing test"
git push
```
Show the Actions tab: run turns **red**. Show Render -> **Events**: no new deploy for this commit. Then revert (`git revert HEAD --no-edit` and `git push`) and show it turns green and deploys.
Option B (safer, if short on time): show screenshots/recording you captured during rehearsal of the same sequence.
**Say:** "Render is set to 'After CI Checks Pass', so it deploys a commit only if every GitHub check on it passed. A red check means no release."

### 6. Render dashboard (5:45 - 6:30)
**Show:** service -> **Events** (deploy history), **Logs**, **Settings** (Build `npm ci`, Start `npm start`, Health Check Path `/health`, Auto-Deploy "After CI Checks Pass"), **Environment** (names only - do **not** reveal the `MONGODB_URI` value).
**Say:** "Credentials live only in Render's environment variables; `.env` is git-ignored."

### 7. Wrap-up (6:30 - 7:00)
**Say:** "CI = automated build and test. CD = automated release after CI passes. Limitations: free tier sleeps after 15 minutes, no authentication yet. Future work: login, rate limiting, staging environment."

## If the deployment is slow
- The free service may be waking up or building: say "Free-tier instances spin down when idle and take about a minute to start" and keep talking through the architecture diagram.
- Show the **Logs** tab to prove the build is progressing.
- If a deploy is still running, demonstrate with the already-deployed version and screenshots of the earlier green pipeline.
- Keep screenshots of: green Actions run, red Actions run, Render Events, live app, `/health`.

## Evidence checklist for the report
Green Actions run; red Actions run (failed test); Render Events list; Render settings page; live app (HTTPS); `/health` response; local `npm test` output; Atlas collection view showing the stored record.
