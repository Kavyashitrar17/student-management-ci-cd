# Project Report

## Title Page (edit these placeholders)

**Project title:** Automated CI/CD Pipeline for a Student Management System
**Course:** Cloud Automation Tools (Topic 3)
**Submitted by:** [Your full name] - [Roll number] - [B.Tech CSE, Semester __]
**Guide / Faculty:** [Faculty name, designation]
**Department / Institute:** [Department], [College name], [University]
**Academic year:** [YYYY-YY]  **Date of submission:** [DD Month YYYY]
**GitHub repository:** [https://github.com/your-username/student-management-cicd]
**Live URL (Render):** [https://your-service.onrender.com]

---

## 1. Abstract
This project implements a Student Management System and, more importantly, an automated Continuous Integration and Continuous Deployment (CI/CD) pipeline around it. The web application (HTML/CSS/JavaScript frontend, Node.js and Express backend) stores student records in MongoDB Atlas. Every push or pull request to the GitHub repository triggers a GitHub Actions workflow that installs dependencies with `npm ci` and runs automated tests. Render, configured to auto-deploy only after CI checks pass, builds and publishes the application at a public HTTPS URL when the tests succeed, and skips the release when they fail. The project demonstrates how automation reduces manual effort, catches defects early and delivers a repeatable release process on free cloud services.

## 2. Introduction
Manual building, testing and releasing is slow and error-prone. DevOps practices, particularly CI/CD, automate these steps. Cloud platforms (PaaS) make it possible to host applications without managing servers. This project combines these ideas in a small, understandable application so that the delivery pipeline can be studied end to end.

## 3. Problem Statement
Educational institutions need to maintain student records, and developers need a safe way to change such software without breaking a running system. Without automation, a developer may deploy untested code, forget to run tests, or release inconsistently. The problem addressed is: *how to build a student record application whose every change is automatically tested and, only if tests pass, automatically deployed to the cloud.*

## 4. Objectives
1. Build a complete CRUD Student Management System with validation and persistent storage.
2. Automate testing on every change using GitHub Actions.
3. Automate deployment to Render so that only changes that pass CI are released.
4. Host the system on a public HTTPS URL using MongoDB Atlas for persistence.
5. Document the system, pipeline, tests and operation for reproducibility.

## 5. Scope
**In scope:** add, view, search, update and delete students; server-side validation; duplicate roll number prevention; health check; automated tests; CI workflow; Render deployment; documentation.
**Out of scope:** user authentication and roles, fee/attendance/marks modules, email notifications, multi-environment (staging) infrastructure, containers and infrastructure-as-code.

## 6. Existing System and Proposed System
**Existing (manual) system:** records kept in spreadsheets or paper; code changes are tested by hand (if at all) and copied to a server manually; no guarantee that what runs matches what was tested. [Adapt to your institution's situation if you wish.]
**Proposed system:** a web application with a database; a Git-based workflow; automatic tests on each push; automatic deployment gated by test results; a health endpoint for monitoring.

## 7. Requirements
### 7.1 Functional
FR1 Add student (name, roll number, email, course, semester). FR2 List students. FR3 Search by name or roll number. FR4 Update a student. FR5 Delete with confirmation. FR6 Validate required fields and email format. FR7 Reject duplicate roll numbers. FR8 Show success/error messages, loading and empty states. FR9 Persist data in MongoDB Atlas. FR10 Provide `GET /health`.
### 7.2 Non-functional
NFR1 Reliability: no data loss on restart. NFR2 Security: secrets in environment variables; input validation; no stack traces to clients. NFR3 Usability: responsive interface for laptop and mobile. NFR4 Maintainability: modular code and automated tests. NFR5 Portability: runs on Windows locally and on Render. NFR6 Cost: free-tier services only. NFR7 Availability caveat: free Render instances sleep when idle.

## 8. Technology Selection and Justification
| Technology | Why chosen |
|---|---|
| HTML/CSS/vanilla JS | No build step, minimal complexity, easy to debug |
| Node.js + Express 5 | Familiar JavaScript end to end; minimal REST framework |
| MongoDB Atlas + Mongoose | Free managed cloud database; schema validation and unique index |
| Node test runner + Supertest | Built into Node (no extra test framework); Supertest tests HTTP endpoints |
| GitHub + GitHub Actions | Source hosting with integrated CI; free for this use |
| Render | PaaS with GitHub integration, automatic HTTPS and CI-gated auto-deploy |
Docker, Kubernetes, Terraform and Ansible were deliberately not used because the requirements are met without them.

## 9. System Architecture
See `ARCHITECTURE.md` for the Mermaid diagrams. Summary: the developer pushes to GitHub; GitHub Actions runs `npm ci` and `npm test`; Render deploys the commit only if checks pass; users reach the Express application over HTTPS; the application stores data in MongoDB Atlas. Internally the backend is layered: routes -> controllers -> validators/repository -> Mongoose model, with a central error handler.

## 10. Database Schema
Collection `students` (Mongoose model `Student`):

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | Generated by MongoDB (exposed as `id`) |
| `fullName` | String | Required, trimmed, 2-100 characters |
| `rollNumber` | String | Required, trimmed, upper-cased, max 30, **unique index** |
| `email` | String | Required, trimmed, lower-cased, valid format (checked by the API) |
| `course` | String | Required, 2-100 characters |
| `semester` | Number | Required, integer 1-8 |
| `createdAt`, `updatedAt` | Date | Added automatically |

## 11. API Design
| Method | Endpoint | Purpose | Status codes |
|---|---|---|---|
| GET | `/health` | Application and database status | 200, 503 |
| GET | `/api/students?search=` | List/search | 200, 400, 503 |
| GET | `/api/students/:id` | Get one | 200, 400, 404 |
| POST | `/api/students` | Create | 201, 400, 409 |
| PUT | `/api/students/:id` | Update | 200, 400, 404, 409 |
| DELETE | `/api/students/:id` | Delete | 200, 400, 404 |
Errors use the JSON shape `{ "error": { "code", "message", "details?" } }`. Full details are in `README.md`.

## 12. CI/CD Implementation
**Continuous Integration.** `.github/workflows/ci.yml` runs on pushes to `main` and pull requests targeting `main`. A single job on `ubuntu-latest` checks out the code, installs Node.js 22, runs `npm ci` and `npm test`. A job-scoped MongoDB 7 service container allows one integration test to exercise a real database. The workflow has read-only repository permissions.
**Continuous Deployment.** The Render web service is linked to the `main` branch with Auto-Deploy set to "After CI Checks Pass". According to Render's documentation, Render waits for the GitHub checks of a commit and deploys only if all pass; it does not deploy if a check fails or no checks are detected. Only this one deployment mechanism is used, so a commit cannot be deployed twice. Build command: `npm ci`; start command: `npm start`; health check path: `/health`.
**Automation summary.** Automated: testing, gating, build, deployment, HTTPS. Manual: coding, committing, one-time setup.
*Fallback (documented, not used by default):* a deploy hook triggered from a GitHub Actions job with `needs: test`.

## 13. Cloud Deployment Methodology
1. Create a MongoDB Atlas free cluster, a least-privilege database user and network access rules.
2. Push the repository to GitHub and obtain a green CI run.
3. Create a Render Web Service from the repository (Node runtime, `npm ci`, `npm start`).
4. Add environment variables `MONGODB_URI` and `NODE_ENV=production` in Render.
5. Set Health Check Path `/health` and Auto-Deploy "After CI Checks Pass".
6. Verify the public HTTPS URL, `/health`, CRUD operations, and data persistence after a manual redeploy.

## 14. Test Plan and Test Cases
Tests use an in-memory repository for isolation; one optional test uses a throw-away MongoDB in CI.

| ID | Test | Expected |
|---|---|---|
| T1 | GET /health with DB connected | 200, status ok |
| T2 | GET /health with DB disconnected | 503, status degraded |
| T3 | API call while DB disconnected | 503 DATABASE_UNAVAILABLE |
| T4 | GET /api/students (empty) | 200, empty list |
| T5 | POST valid student | 201, roll number upper-cased, email lower-cased |
| T6 | POST missing fields | 400 with details per field |
| T7 | POST invalid email / semester 9 | 400 |
| T8 | POST object instead of string (injection attempt) | 400 |
| T9 | POST malformed JSON | 400 INVALID_JSON |
| T10 | POST duplicate roll number (different case) | 409 |
| T11 | Search by name, by roll number; repeated search parameter | filtered results; 400 for array |
| T12 | GET by id: found / missing / bad id | 200 / 404 / 400 |
| T13 | PUT existing student | 200, fields updated |
| T14 | PUT missing / duplicate roll | 404 / 409 |
| T15 | DELETE then DELETE again | 200 then 404 |
| T16 | Unexpected repository error | 500, generic message, no secrets leaked |
| T17 | Connection-type database error | 503 |
| T18 | Unknown API route | 404 JSON |
| T19 | Real MongoDB: full cycle incl. unique index (CI only) | all steps succeed |

## 15. Results and Observations
*To be completed by the student after running the project. Do not copy numbers from elsewhere; record your own.*
- Local `npm test` result: [paste summary, e.g. tests/pass/fail/skipped counts] - Screenshot: [Figure 1]
- GitHub Actions green run: [run URL, duration] - Screenshot: [Figure 2]
- Deliberately failed run and Render behaviour (deploy skipped?): [observation] - Screenshots: [Figure 3, 4]
- Render deployment: [public URL, date, build time] - Screenshot: [Figure 5]
- `/health` response: [paste JSON] - Screenshot: [Figure 6]
- Data persistence after redeploy: [yes/no, observation]
- Cold-start delay after idle: [measured seconds]
- Problems encountered and fixes: [list]

## 16. Limitations
No authentication or authorisation; no rate limiting; no pagination (all records are returned); free Render instances sleep after 15 minutes of inactivity and have monthly instance-hour limits; Atlas must allow access from anywhere (`0.0.0.0/0`) because free Render instances have no fixed outbound IP; single production environment without staging; the real-database test only runs in CI.

## 17. Future Enhancements
Login with roles (admin/staff); pagination and sorting; CSV import/export; rate limiting and audit logs; staging environment with preview deployments; code coverage and linting in CI; automatic dependency updates; monitoring and alerts; automated post-deploy smoke test.

## 18. Conclusion
The project delivers a working Student Management System and an automated pipeline in which every change is tested and only passing changes are released to a public HTTPS endpoint. It illustrates the core cloud-automation ideas of automated testing, gated deployment, managed cloud services and externalised configuration, using only free tools. [Add your own concluding reflections after running the project.]

## 19. References
1. Render Documentation - Deploys and auto-deploy settings: https://render.com/docs/deploys
2. Render Documentation - Free instances: https://render.com/docs/free
3. Render Documentation - Setting your Node.js version: https://render.com/docs/node-version
4. Render Documentation - Deploy hooks: https://render.com/docs/deploy-hooks
5. GitHub Docs - GitHub Actions: https://docs.github.com/actions
6. MongoDB Atlas Documentation: https://www.mongodb.com/docs/atlas/
7. Express.js: https://expressjs.com
8. Mongoose: https://mongoosejs.com
9. Node.js test runner: https://nodejs.org/api/test.html
10. Supertest: https://github.com/ladjs/supertest
[Add any textbooks or papers your institution requires.]
