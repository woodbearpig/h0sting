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

## Next Tasks
- Await user feedback; consider CSV export and photo upload as next enhancement.
