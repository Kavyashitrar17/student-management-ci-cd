# Student Management System - Automated CI/CD Pipeline 

A full-stack Student Management System (Node.js, Express, MongoDB Atlas) with an automated
Continous integration/Continous Deployment pipeline: **GitHub Actions** runs the tests on every change and **Render** deploys the
app to a public HTTPS URL only when those tests pass.

> Course: Cloud Automation Tools - Topic 3: Automated CI/CD Pipeline for a Student Management System

## 1. Features

- Add, view, search (name or roll number), update and delete students (delete asks for confirmation)
- Server-side validation (required fields, email format, semester 1-8) and **unique roll numbers** (case-insensitive)
- Loading state, empty state, success and error messages; responsive dashboard with statistics
- Data stored in **MongoDB Atlas**, so it survives restarts and redeploys
- `GET /health` reports app and database status (200 healthy / 503 degraded)
- Centralised error handling: no stack traces or secrets are sent to the browser
- 19 automated tests (18 run anywhere; 1 real-database test runs in CI)

## 2. Technology stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript (no framework, no external libraries) |
| Backend | Node.js 22+, Express 5, Mongoose 9, Helmet, dotenv |
| Database | MongoDB Atlas (free M0 cluster) |
| Tests | Node.js built-in test runner (`node --test`) + Supertest |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| CD / hosting | Render Web Service (auto-deploy "After CI Checks Pass") |

## 3. Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the diagram. In short:

```
Developer -> git push -> GitHub -> GitHub Actions (npm ci, npm test)
                                      |-- tests fail -> pipeline red, Render does NOT deploy
                                      '-- tests pass -> Render pulls commit, builds, deploys
Browser (HTTPS) -> Render Web Service (Express) -> MongoDB Atlas
```

### CI vs CD - and what is automated

- **Continuous Integration (CI)**: every push/PR is automatically built and tested so broken code is detected immediately. *Automated by GitHub Actions.*
- **Continuous Deployment (CD)**: every change that passes CI is automatically released to production. *Automated by Render's "After CI Checks Pass" setting.*
- Manual parts: writing code, `git push`, one-time Render/Atlas setup, and merging pull requests.

## 4. Project structure

```
student-management-cicd/
|-- .github/workflows/ci.yml        CI pipeline
|-- public/                         Frontend (index.html, styles.css, app.js)
|-- src/
|   |-- server.js                   Entry point (binds PORT, connects to Atlas)
|   |-- app.js                      Express app factory (middleware, routes, health)
|   |-- config/database.js          Mongoose connection helpers
|   |-- models/Student.js           Mongoose schema (unique rollNumber index)
|   |-- repositories/studentRepository.js   All database queries
|   |-- validators/studentValidator.js      Input validation, ObjectId + search checks
|   |-- controllers/studentController.js    Request handlers
|   |-- routes/studentRoutes.js     /api/students routes
|   '-- middleware/errorHandler.js  ApiError, 404, DB guard, central error handler
|-- tests/                          health, students, optional Mongo integration tests
|-- .env.example  .gitignore  .node-version  package.json  package-lock.json
'-- README.md  REPORT.md  ARCHITECTURE.md  DEMO_GUIDE.md  VIVA_QUESTIONS.md
```

## 5. Environment variables

| Variable | Where | Meaning |
|---|---|---|
| `MONGODB_URI` | `.env` locally; Render dashboard | Atlas connection string (**secret**) |
| `NODE_ENV` | `.env` locally; Render dashboard | `development` locally, `production` on Render |
| `PORT` | `.env` locally only | Render sets this itself - **do not** set it on Render |
| `TEST_MONGODB_URI` | CI only (optional) | Throw-away DB for the integration test; must contain the word `test` |

## 6. Windows setup (VS Code + PowerShell)

### 6.1 Install tools
1. Install **Node.js LTS** (22 or newer) from https://nodejs.org - accept defaults.
2. Install **Git** from https://git-scm.com/download/win - accept defaults.
3. Install **VS Code** from https://code.visualstudio.com
4. Open a **new** PowerShell window and check:
```powershell
node -v
npm -v
git --version
```

### 6.2 Get the project files
Unzip the project (or copy the folders) to e.g. `C:\Projects\student-management-cicd`, then:
```powershell
cd C:\Projects\student-management-cicd
code .
npm install
```
(`npm install` creates `node_modules`. The committed `package-lock.json` makes `npm ci` work in CI.)

### 6.3 MongoDB Atlas (database)
Atlas's screens change occasionally; names below may differ slightly.
1. Sign up at https://www.mongodb.com/cloud/atlas and create a **free (M0)** cluster. Pick the region nearest to you (for Render, any is fine).
2. **Database Access -> Add New Database User**: authentication "Password"; username e.g. `sms_app`; click *Autogenerate Secure Password* and **copy it**. Privileges: *Only read and write to a specific database* -> database `student_management`. (Least privilege: this user cannot touch anything else.)
3. **Network Access -> Add IP Address**:
   - For local work, choose **Add Current IP Address**.
   - For Render's free plan you must also allow **`0.0.0.0/0` (Allow access from anywhere)**, because free Render services do not have a fixed outbound IP. This is the standard trade-off for student projects; it is made safe by the long random password, the least-privilege user, and TLS (Atlas always encrypts). State this limitation in your viva.
4. **Database -> Connect -> Drivers**: copy the connection string. It looks like
   `mongodb+srv://sms_app:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`.
   Insert the database name before the `?` -> `.../student_management?retryWrites=...`.
   If the password contains special characters (`@ : / ? # %`), URL-encode them (or regenerate a password with letters and digits only).

### 6.4 Configure `.env`
```powershell
Copy-Item .env.example .env
code .env
```
Replace the placeholders with your real connection string. **`.env` is git-ignored - never commit it.**

### 6.5 Run locally
```powershell
npm start
```
Open http://localhost:3000. The sidebar shows "Server and database online" when Atlas is connected. For auto-restart while editing use `npm run dev`.

### 6.6 Manually test every CRUD operation
In the browser: **Add** a student -> it appears in the table -> **search** by name and by roll number -> **Edit** and save -> try adding the same roll number again (error shown) -> **Delete** and confirm. Or from PowerShell (use `curl.exe`, not the `curl` alias):
```powershell
curl.exe http://localhost:3000/health
curl.exe http://localhost:3000/api/students
curl.exe -X POST http://localhost:3000/api/students -H "Content-Type: application/json" -d "{\"fullName\":\"Asha Verma\",\"rollNumber\":\"CS101\",\"email\":\"asha@example.com\",\"course\":\"B.Tech CSE\",\"semester\":5}"
```

### 6.7 Run automated tests
```powershell
npm test
```
- **Passing:** lines starting with `ok`, and a summary `# fail 0`.
- **Failing:** a line starting with `not ok`, an assertion message such as `Expected values to be strictly equal: 200 !== 400`, a summary `# fail 1`, and exit code 1 (which is what turns the GitHub Actions run red).
- One test (`tests/mongo.integration.test.js`) is **skipped** locally (`# SKIP TEST_MONGODB_URI is not set`); that is expected. The other tests use an in-memory fake database, so no Atlas credentials are needed and your real data is never touched.

### 6.8 Git and GitHub
1. Create an empty repository on https://github.com/new (e.g. `student-management-cicd`, **no** README/.gitignore added by GitHub).
2. In PowerShell:
```powershell
git init -b main
git config user.name "Your Name"
git config user.email "you@example.com"
git add .
git status          # confirm .env and node_modules are NOT listed
git commit -m "Initial commit: Student Management System with CI"
git remote add origin https://github.com/<your-username>/student-management-cicd.git
git push -u origin main
```
3. Open the repo's **Actions** tab: the **CI** workflow should run and turn green.

## 7. GitHub Actions workflow (`.github/workflows/ci.yml`)

Triggers: push to `main`, and pull requests targeting `main`. Steps: checkout -> setup Node 22 (npm cache) -> `npm ci` -> `npm test`. A MongoDB 7 service container (job-scoped, throw-away) is started so the real-database integration test runs in CI. Pull requests only run tests - they never deploy, because Render deploys only the linked branch (`main`). The workflow has no path filters on purpose (see 8.5).

## 8. Deploy to Render

### 8.1 How CD works here (one mechanism only)
Render's GitHub integration with **Auto-Deploy = "After CI Checks Pass"**. Render waits for the commit's GitHub checks; per Render's docs it deploys only if all detected checks pass (a conclusion of success, neutral or skipped counts as passed), and does **not** deploy if a check fails or if zero checks are detected. No second deploy mechanism exists, so a commit is never deployed twice.

**Plan caveat:** Render's documentation I checked (render.com/docs/deploys and the May 2025 changelog) does not mark this setting as paid-only, but I could not test your account. If the option is missing or locked in your dashboard, use the fallback in 8.6.

### 8.2 Create the web service
Push the code to GitHub first and wait for the first green CI run. Then at https://dashboard.render.com:
1. **New -> Web Service -> Git Provider** -> authorise Render for GitHub (select your repo) -> choose `student-management-cicd`.
2. Settings: **Name** any; **Language/Runtime** `Node`; **Branch** `main`; **Build Command** `npm ci`; **Start Command** `npm start`; **Instance Type** Free.
3. **Environment variables** (Add): `MONGODB_URI` = your Atlas string; `NODE_ENV` = `production`. Do **not** add `PORT`.
4. Click **Create Web Service**. The first deploy starts at creation and takes a few minutes; watch the **Logs**.
5. After creation open **Settings**: set **Health Check Path** to `/health`, and **Auto-Deploy** to **After CI Checks Pass**. Save.
6. The `.node-version` file (`22`) tells Render which Node version to use.

### 8.3 Verify
- Open the `https://<your-service>.onrender.com` URL shown at the top of the service page (HTTPS is provided by Render automatically).
- `https://<your-service>.onrender.com/health` should return `{"status":"ok","database":"connected",...}`.
- Add a student, then **Manual Deploy -> Deploy latest commit**, reload: the student is still there (stored in Atlas, not on Render's disk).
- Logs: service page -> **Logs**. Common failures: wrong `MONGODB_URI` ("MongoDB connection failed ... Retrying" in logs, `/health` returns 503), Atlas network access missing `0.0.0.0/0` (same symptom), build errors (check Node version / `npm ci`).

### 8.4 Prove that failing tests block deployment (rehearse this once)
1. Edit a test so it fails (e.g. change `assert.equal(res.status, 200)` to `201` in `tests/health.test.js`), commit and push to `main`.
2. GitHub **Actions** shows a red CI run; Render's **Events** tab should not show a new deploy for that commit (check how Render labels it - rehearse before the viva).
3. Revert the change, push again: CI turns green and Render deploys.

### 8.5 Free-tier limitations
- Free web services **spin down after 15 minutes without inbound traffic**; the next request waits while the service starts (often about a minute) and Render shows a loading page. Open the site 2-3 minutes before your demo.
- 750 free instance hours per month per workspace; if used up, free services are suspended until next month. Free services also count against build-pipeline minutes and bandwidth allowances.
- Render may restart a free service at any time; local disk is not persistent - that is why data lives in Atlas.
- Atlas M0 is free but has a storage cap (512 MB) and shared resources.
- Do not add path filters to the workflow; a commit with zero detected checks is not deployed.

### 8.6 Fallback if "After CI Checks Pass" is unavailable (not verified on a live account)
Set Render **Auto-Deploy = Off** (so there is still only one mechanism), create a **Deploy Hook** (Render service -> Settings -> Deploy Hook), save its URL as GitHub secret `RENDER_DEPLOY_HOOK_URL` (repo -> Settings -> Secrets and variables -> Actions), and add this job to `ci.yml`:
```yaml
  deploy:
    name: Deploy to Render
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render deploy hook
        run: curl --fail --silent --show-error -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
```
`needs: test` means the deploy job runs only if tests succeed. Note a deploy hook returns immediately; it does not report whether the deploy itself succeeded.

## 9. API documentation

Base URL: `http://localhost:3000` or your Render URL. All bodies are JSON.
Student object: `{ id, fullName, rollNumber, email, course, semester, createdAt, updatedAt }`.

| Method & path | Description | Success | Errors |
|---|---|---|---|
| `GET /health` | App + database status | 200 `{status:"ok",database:"connected",...}` | 503 `{status:"degraded"}` |
| `GET /api/students?search=text` | List (optional search by name/roll) | 200 `{data:[...],meta:{count,total,courses}}` | 400 invalid search |
| `GET /api/students/:id` | One student | 200 `{data}` | 400 bad id, 404 |
| `POST /api/students` | Create | 201 `{data}` | 400 validation, 409 duplicate roll |
| `PUT /api/students/:id` | Replace all fields | 200 `{data}` | 400, 404, 409 |
| `DELETE /api/students/:id` | Delete | 200 `{data,message}` | 400, 404 |

POST/PUT body: `fullName` (2-100 chars), `rollNumber` (1-30 chars: letters, digits, `- _ /`; stored upper-case), `email` (valid format; stored lower-case), `course` (2-100), `semester` (integer 1-8).

Error format: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{"field":"email","message":"..."}] } }`.
Codes: `VALIDATION_ERROR`, `INVALID_ID`, `INVALID_SEARCH`, `INVALID_JSON`, `STUDENT_NOT_FOUND`, `DUPLICATE_ROLL_NUMBER`, `DATABASE_UNAVAILABLE`, `NOT_FOUND`, `INTERNAL_ERROR`. While the database is unreachable all `/api` routes return 503.

## 10. Security notes
Secrets only in environment variables (`.env` ignored by Git); validation rejects non-string input so objects like `{"$ne":""}` cannot reach MongoDB; search text is regex-escaped; ids must be 24-hex ObjectIds; the frontend writes data with `textContent` (never `innerHTML`); Helmet sets security headers; request bodies are limited to 10 KB; production errors are generic. Not included (listed as future work): authentication/authorization, rate limiting.

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| `'node' is not recognized` | Close and reopen PowerShell/VS Code after installing Node; reinstall if needed. |
| `FATAL: MONGODB_URI is not set` | Create `.env` from `.env.example` in the project root (same folder as `package.json`). |
| `MongoDB connection failed ... ENOTFOUND / querySrv` | Check the host in the connection string; check your internet/DNS. |
| `bad auth : Authentication failed` | Wrong username/password in `MONGODB_URI`; URL-encode special characters or regenerate a simple password. |
| Server selection timeout / `ECONNREFUSED` | Atlas **Network Access** does not include your IP (or `0.0.0.0/0` on Render). Wait ~1 minute after changing it. |
| `EADDRINUSE: port 3000` | Another process uses the port: change `PORT` in `.env`, or stop the other process. |
| `npm test` shows `ERR_MODULE_NOT_FOUND`/`Cannot find module` | Run `npm install` first. |
| `npm ci` fails: lockfile out of sync | Run `npm install`, commit the updated `package-lock.json`. |
| `curl` in PowerShell behaves oddly | Use `curl.exe` instead of `curl`. |
| Render site is slow on first load | Free service was asleep; wait ~1 minute and refresh. |
| Render deploy never starts after a push | Check CI actually ran (Actions tab) and passed; check Auto-Deploy setting. |
| CI integration test fails but local passes | Open the failed step in Actions; the Mongo service container may not have been healthy - re-run the job. |

## 12. What was verified

Executed and passing in the authoring environment (Node 22): 18 automated tests, `npm ci` from the lockfile in a clean copy, HTTP smoke test of the frontend/API/health/security headers using the in-memory repository, server startup with missing and unreachable `MONGODB_URI`, and YAML parsing of the workflow. **Not executed** (needs your accounts): real MongoDB Atlas connection, the CI run on GitHub, the Render deployment, and visual browser rendering of the UI. Those are assumptions until you run them.
