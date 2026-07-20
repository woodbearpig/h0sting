# Contractor Check-In — PRD

## Original Problem Statement
Build a "Contractor Check-In" web app for real-time contractor location tracking with a dynamic CMS. Public mobile-first check-in page (OpenStreetMap + Leaflet, no paid maps), contractor enters Name/Email/Phone + admin-defined custom fields, a prominent "Share Location" button triggers geolocation behind a GDPR/CCPA privacy consent modal, coordinates sent to backend and shown as live map pins (auto-refresh). Secure admin dashboard for content editing, job management, and viewing check-in data. Originally spec'd for VPS (SQLite/Postgres); built on React+FastAPI+MongoDB per user choice with VPS deployment notes.

## Architecture
- Frontend: React 19 (CRA/craco), react-leaflet 5 + Leaflet 1.9 (OpenStreetMap tiles), Tailwind + shadcn/ui, sonner toasts. Token in localStorage (`cc_token`), Bearer header.
- Backend: FastAPI, Motor/MongoDB, JWT (PyJWT) + bcrypt auth, all routes under `/api`.
- DB collections: users, settings (_id:"global"), jobs, checkins.

## User Personas
- Contractor (public): checks in on-site by sharing location.
- Site Admin: manages jobs, site content, and reviews check-ins.

## Core Requirements (static)
- Public dynamic check-in page with custom fields + privacy consent + geolocation.
- Live Leaflet map with pins storing raw lat/long; 5s auto-refresh.
- JWT-protected admin: content editor, job CRUD, check-ins table + live map.

## Implemented (2026-07-15)
- JWT admin login (admin@techspider.site), protected `/admin` route.
- Public check-in page: dynamic job title/description/hero/button label + custom fields, validation, GDPR/CCPA privacy modal gating geolocation, POST check-in, success state, live map + pin count.
- Admin dashboard: Check-Ins table (Name/Email/Phone/Coords/Job/Timestamp) with live map + job filter; Jobs create/edit/delete with custom fields, default map area, active toggle, shareable link; Site Content editor (title/tagline/logo).
- Seeded sample job + settings. VPS deployment guide at /app/DEPLOYMENT.md.
- Tested: backend 21/21 pass; frontend core flows pass. Fixed clipboard error handling + dialog a11y.

## Backlog / Remaining
- P1: Photo upload for contractor check-ins (object storage) — deferred (user chose admin images only).
- P2: Brute-force lockout / rate limiting on login; password reset flow.
- P2: CSV export of check-ins; split AdminDashboard into smaller files.
- P2: WebSocket live push instead of polling.

## VPS Support Log
- 2026-06: Admin login on VPS (bondforgiveness.com) returned "Invalid email or password". ROOT CAUSE: admin password hash is seeded/re-synced only at backend startup (server.py L394-396); user changed `.env` ADMIN_PASSWORD but never restarted `cc-backend`, so Mongo held the old hash. FIX: `pm2 restart cc-backend` re-syncs hash to `.env`. Verified working by user. REMINDER for future: any ADMIN_EMAIL/ADMIN_PASSWORD `.env` change requires `pm2 restart cc-backend`.
- 2026-06: Dynamic browser tab title added (App.js ThemeLoader sets document.title from settings). Added separate editable "Browser Tab Title" settings field (falls back to Site Title — Tagline). NOTE: relative `/api` does NOT proxy on localhost:3000 dev server — always test via REACT_APP_BACKEND_URL preview URL.
- 2026-06: Link-preview (Open Graph) meta made editable from admin (Option B). Added Settings fields share_title/share_description/share_image_url + admin "Link Preview" section. Backend serves SPA index.html via catch-all `@app.get("/{full_path:path}")` injecting og/twitter meta (server.py `_inject_meta`), and `/api/share-image` serves the uploaded/data-URL image so crawlers can load it. Requires VPS Nginx to proxy page HTML to backend — see /app/LINK_PREVIEW_SETUP.md. Backend verified via curl; admin fields verified on preview. REMINDER: user must "Save to Github" then pull on VPS — GitHub was behind /app repo which is why an earlier field appeared missing.
- 2026-06: VPS had TWO backend clones — PM2 runs `/root/contractor-checkin/backend` (pull backend + set .env here); frontend built from `/root/h0sting/frontend` and copied to /var/www/html. Backend changes/env only take effect in the clone PM2 runs. Nginx edited (via scripted replace) so `location = /` and `@spa` proxy page HTML to backend while `/static` served directly. Link preview confirmed LIVE on bondforgiveness.com.
- 2026-06: PER-JOB editable link previews added. Job/JobInput models gained share_title/share_description/share_image_url. `serve_spa` detects `/checkin/<24-hex-id>` and injects that job's share fields (fallback: job.title/description/hero_image → global settings). `/api/share-image?job_id=<id>` serves the job's image. Admin JobDialog has a per-job "Link Preview" section. Verified via curl (job og tags + image 200) and admin UI screenshot on preview.
- 2026-06: THREE features added & tested (iteration_5, frontend 100%). (1) Check-in deletion: backend DELETE /api/checkins/{id}, POST /api/checkins/bulk-delete {ids:[]}, DELETE /api/checkins?job_id= (all auth-gated); admin Check-Ins tab has row checkboxes, per-row trash, 'Delete Selected (n)', 'Clear All' (window.confirm gated). (2) Map pin selection: selecting rows filters Live Map to selected pins only (none selected = all shown); hint text + 'Show all' button. (3) Removed green success toast on public check-in; success box (heading/body/button) now per-job editable via Job.success_heading/success_body/success_button_label + JobDialog 'Success Message' section (CheckInPage falls back to defaults if blank).

## VPS Deploy Gotchas (learned 2026-06/07)
- Single clone now: `/root/contractor-checkin` (PM2 runs backend via start.sh + venv; frontend built here too). `/root/h0sting` no longer exists.
- Repo was RENAMED h0sting -> h0sting3. The clone's remote was stale; fixed with `git remote set-url origin https://github.com/woodbearpig/h0sting3.git`. Private repo => needs PAT (username woodbearpig + classic token w/ repo scope); cached via `git config --global credential.helper store`.
- `.env` is gitignored (never pulled) — SMTP_* and FRONTEND_INDEX_PATH must be set manually on VPS. A stray leading backslash on the MONGO_URL line (`\MONGO_URL=`) caused KeyError: 'MONGO_URL' -> 502; fixed with `sed -i '1s/^\\//' .env`.
- New Python deps DON'T auto-install on git pull. Must run `/root/contractor-checkin/backend/venv/bin/pip install <pkg>` (use full venv path, not bare pip; full `-r requirements.txt` can error partway and skip pkgs). aiosmtplib was the missing one for email.
- Standard deploy after Save-to-Github: `cd /root/contractor-checkin && git pull origin main && ./backend/venv/bin/pip install -r backend/requirements.txt && cd frontend && yarn install && yarn build && sudo cp -r build/* /var/www/html/ && pm2 restart cc-backend`.

## Next Tasks
- 2026-07: PER-JOB SUPERVISOR NOTIFICATIONS. Job/JobInput gained supervisor_email_1, supervisor_email_2, notify_admin. On POST /api/checkins, a BackgroundTask (_notify_checkin) emails recipients (1-2 supervisors + admin if notify_admin) the check-in details (fields, coords + OpenStreetMap link, time) via shared _smtp_send/_smtp_config helpers (refactored out of send-invite). Auto-on when >=1 supervisor email set; sends in background so mail failure never blocks check-in. Admin JobDialog "Supervisor Notifications" section (job-supervisor-1/2, job-notify-admin-switch). VERIFIED: fields persist (PUT+GET), checkin 200, background task fires + graceful skip w/o SMTP; UI renders. NOT TESTED: real SMTP delivery (needs VPS creds). NOTE: model fields must be added to BOTH JobInput and Job (twice this session a field landed in only one, silently dropped by API — always verify PUT+GET round-trip). Also removed stray trailing corruption in server.py (fragment + duplicate shutdown handler) that would break deploy.
- Deploy: no new Python deps this time. Save to Github -> on VPS: cd /root/contractor-checkin && git pull origin main && cd frontend && yarn build && sudo cp -r build/* /var/www/html/ && pm2 restart cc-backend.
- 2026-06: EMAIL INVITE feature. Backend POST /api/send-invite (auth) sends one HTML email via aiosmtplib using SMTP_* env vars (port 465=SSL, else STARTTLS); friendly 500 if unconfigured, 400 if link not http(s). Settings gained email_subject/email_body/email_button_label (defaults, {name} placeholder). Admin new "Send Invite" tab (InviteTab): recipient/name, link destination (main site or per-job, live preview), editable subject/body/button, Send + "Save as Default Template". requirements.txt has aiosmtplib==5.1.2. backend/.env has empty SMTP_HOST/PORT/USERNAME/PASSWORD/FROM keys. VERIFIED: auth guard (401), unconfigured guard (500 friendly), tab renders + link preview + validation on preview URL. NOT TESTED: real SMTP delivery (needs user's Hostinger mailbox creds on VPS). User will use help@bondforgiveness.com (multiple domains eventually); one recipient at a time.
- Consolidate the two VPS clones (option a: keep /root/contractor-checkin, archive /root/h0sting). Steps given; awaiting user confirmation.
