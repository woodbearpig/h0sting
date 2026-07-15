# Authentication Testing Reference

Admin login (JWT, Bearer token in localStorage key `cc_token`):
- Email: admin@techspider.site
- Password: Admin@12345

API checks:
```
curl -s -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@techspider.site","password":"Admin@12345"}'
# -> { access_token, user }

TOKEN=<access_token>
curl -s http://localhost:8001/api/auth/me -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:8001/api/checkins -H "Authorization: Bearer $TOKEN"
```
Protected endpoints (401 without token): PUT /api/settings, POST/PUT/DELETE /api/jobs, GET /api/checkins.
Public endpoints: GET /api/settings, GET /api/jobs, GET /api/jobs/{id}, GET /api/jobs/{id}/checkins, POST /api/checkins.
