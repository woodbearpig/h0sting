# Contractor Check-In — VPS Deployment Guide (techspider.site)

This app is built with **React (frontend)** + **FastAPI (backend)** + **MongoDB**.
Below is how to deploy it to a standard Linux VPS with **Nginx + PM2/systemd** and **Let's Encrypt SSL**.

## 1. Recommended folder structure on VPS
```
/var/www/contractor-checkin/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env                 # secrets (never commit)
├── frontend/
│   ├── build/               # produced by `yarn build`
│   └── ...
└── ecosystem.config.js      # PM2 process file (optional)
```

## 2. Prerequisites
```bash
sudo apt update && sudo apt install -y python3-venv nginx mongodb
# or use MongoDB Atlas and skip local mongodb
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt install -y nodejs
sudo npm i -g yarn pm2
```

## 3. Backend
```bash
cd /var/www/contractor-checkin/backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```
Create `backend/.env` (use strong values, never hardcode secrets):
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="contractor_checkin"
CORS_ORIGINS="https://techspider.site"
JWT_SECRET="<run: openssl rand -hex 32>"
ADMIN_EMAIL="admin@techspider.site"
ADMIN_PASSWORD="<strong-password>"
```
Run with PM2 (uvicorn/gunicorn):
```bash
pm2 start "venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001" --name cc-backend
pm2 save && pm2 startup
```

## 4. Frontend
```bash
cd /var/www/contractor-checkin/frontend
# set the public API base in .env
echo 'REACT_APP_BACKEND_URL=https://techspider.site' > .env
yarn install && yarn build
```

## 5. Nginx (serves frontend build + proxies /api to backend)
`/etc/nginx/sites-available/techspider.site`:
```nginx
server {
    listen 80;
    server_name techspider.site www.techspider.site;

    root /var/www/contractor-checkin/frontend/build;
    index index.html;

    # SPA routing
    location / {
        try_files $uri /index.html;
    }

    # API proxy — all backend routes are under /api
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable + reload:
```bash
sudo ln -s /etc/nginx/sites-available/techspider.site /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 6. SSL / HTTPS (mandatory — geolocation requires HTTPS)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d techspider.site -d www.techspider.site
```
Certbot auto-adds the 443 server block and an HTTP→HTTPS redirect. `navigator.geolocation`
only works on secure origins, so HTTPS is required in production.

## 7. Security notes
- All secrets live in `backend/.env` (JWT_SECRET, ADMIN_PASSWORD) — never in code or git.
- Admin panel is behind JWT auth; `/admin` redirects to `/admin/login` if no valid token.
- Privacy consent modal (GDPR/CCPA) intercepts before the browser geolocation prompt.
- Rotate `JWT_SECRET` and admin password regularly; consider adding rate limiting at Nginx.

## 8. Data model (MongoDB collections)
- `users`   : { email, password_hash (bcrypt), name, role }
- `settings`: { _id:"global", site_title, logo_url, tagline }
- `jobs`    : { title, description, hero_image_url, button_label, custom_fields[], default_map_area{lat,lng,zoom}, active }
- `checkins`: { job_id, contractor_name, email, phone, custom_data{}, latitude, longitude, created_at }
