# Viva Questions and Answers

## Project choice and automation
**1. Why did you choose this topic?**
CI/CD is the core of cloud automation: it removes manual, error-prone testing and releasing. A Student Management System is a simple, familiar application, so the focus stays on the pipeline.

**2. How is deployment automated in your project?**
I push to the `main` branch. GitHub Actions runs `npm ci` and `npm test`. Render is configured with Auto-Deploy "After CI Checks Pass", so when the checks are green it pulls the commit, runs `npm ci`, starts `npm start` and routes traffic to the new version. No manual steps after the push.

**3. How do failed tests prevent an incorrect release?**
If a test fails, the GitHub check for that commit is red. Render waits for the checks and does not deploy when any check fails (or when none are detected), so the previous working version stays live.

**4. What is the difference between Continuous Integration and Continuous Deployment?**
CI = automatically build and test every change after it is pushed. Continuous Delivery = every passing change is releasable, with a manual approval. Continuous Deployment = every passing change is released to production automatically. My project does CI (GitHub Actions) and Continuous Deployment (Render after checks pass).

**5. Which parts are automated and which are manual?**
Automated: test run, deployment, HTTPS, restarts. Manual: writing code, pushing/merging, one-time setup of Atlas, Render and secrets.

## Cloud and DevOps
**6. What is cloud computing?**
On-demand delivery of computing resources (servers, storage, databases) over the internet, paid or free by usage, without owning hardware.

**7. Which cloud service models appear in your project?**
Render is PaaS (we supply code; Render manages servers and HTTPS). MongoDB Atlas is DBaaS. GitHub Actions is CI as a service.

**8. What is DevOps?**
A culture and set of practices that unite development and operations through automation, continuous testing and fast feedback, so software is released quickly and reliably.

**9. Why not Docker or Kubernetes?**
Render builds Node.js directly from the repository, so containers are unnecessary here. Fewer moving parts means fewer failure points.

**10. What are the limits of Render's free plan?**
Spins down after 15 minutes without traffic (slow first request), 750 free instance hours per month, may restart at any time, no persistent local disk. My data is in Atlas so restarts do not lose it.

## Git, GitHub and GitHub Actions
**11. What is Git versus GitHub?**
Git is the local version-control tool; GitHub is a hosting service for Git repositories with collaboration features and Actions.

**12. Explain your workflow file.**
`ci.yml` triggers on push to `main` and PRs to `main`; one job on `ubuntu-latest` checks out code, sets up Node 22, runs `npm ci`, then `npm test`. A MongoDB service container supports the integration test.

**13. Why `npm ci` instead of `npm install`?**
`npm ci` installs exactly what `package-lock.json` lists, fails if the lockfile and `package.json` disagree, and is faster and reproducible - ideal for CI.

**14. What happens on a pull request?**
Tests run, giving a pass/fail check on the PR, but nothing deploys because Render deploys only the `main` branch.

## Application, REST and database
**15. What is a REST API? Which status codes do you use?**
An HTTP-based style where URLs identify resources and methods (GET, POST, PUT, DELETE) act on them. I use 200, 201, 400 (validation/bad id), 404 (not found), 409 (duplicate roll number), 413, 500 and 503 (database unavailable).

**16. Why Express?**
Minimal, widely used Node.js framework with routing and middleware. Express 5 also forwards errors from async handlers automatically.

**17. Why MongoDB Atlas, and how is the roll number kept unique?**
Atlas gives a free managed cloud database with persistence. The Mongoose schema declares `unique: true` on `rollNumber`, creating a MongoDB unique index; the duplicate-key error (11000) is mapped to HTTP 409. Roll numbers are upper-cased so `cs1` and `CS1` clash.

**18. What is the repository layer and why did you add it?**
All database calls sit in one module. Tests can substitute an in-memory fake, so tests are fast, repeatable and never touch production data.

**19. What does `/health` do?**
Returns 200 with `status: ok` when the database is connected and 503 `degraded` otherwise. Render uses it as the health check, and it is a quick demo and debugging tool.

## Testing, config and security
**20. What do your tests cover?**
Health check, listing, valid create, invalid input, duplicate roll number, update, 404 on missing student, delete, search, bad ObjectId, malformed JSON, injection-style input, and database errors (500 generic, 503 for connection errors).

**21. How do you keep tests isolated and safe?**
Unit/API tests use an in-memory repository (fresh per test). The only real-database test runs only if `TEST_MONGODB_URI` is set, refuses a URI that lacks "test", and in CI uses a throw-away container - never Atlas production.

**22. What are environment variables and why use them?**
Configuration read from the process environment (`MONGODB_URI`, `NODE_ENV`, `PORT`). They keep secrets out of source code; locally in a git-ignored `.env`, on Render in the dashboard.

**23. How do you prevent NoSQL injection and XSS?**
Server accepts only plain strings (objects like `{"$ne":""}` are rejected), escapes regex characters in search, validates ObjectIds as 24 hex characters, and the frontend renders with `textContent` instead of `innerHTML`.

**24. What are the security limitations?**
No login/roles, no rate limiting, and Atlas allows `0.0.0.0/0` because free Render has no fixed outbound IP (mitigated by a strong password, least-privilege DB user and TLS).

**25. What would you improve?**
Authentication and roles, rate limiting, pagination, a staging environment with preview deploys, monitoring/alerts, and automatic dependency updates.
