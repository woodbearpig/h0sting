# Editable Link-Preview Setup (Option B — server-rendered meta tags)

The site link preview (title / description / thumbnail shown when the URL is
shared in a text, WhatsApp, Slack, etc.) is now controlled from the admin panel
under **Site Content → Link Preview**. Because link crawlers do NOT run
JavaScript, the backend injects these tags into the page HTML on the fly.

To make this live on the VPS you must (1) point the backend at the built
index.html and (2) route page requests through the backend in Nginx.

## 1. Backend env
Add this line to `backend/.env`, then `pm2 restart cc-backend`:

    FRONTEND_INDEX_PATH=/var/www/html/index.html

(Optional — if omitted the backend falls back to `frontend/build/index.html`.)

## 2. Nginx
Inside your existing HTTPS `server { ... }` block for the domain, replace the
current `location / { ... }` with the blocks below. Keep your certbot/SSL lines
untouched.

    # API -> backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Root page -> backend (injects link-preview meta tags)
    location = / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets served directly; SPA routes fall through to the backend
    location / {
        root /var/www/html;
        try_files $uri @spa;
    }

    location @spa {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

Then validate + reload:

    sudo nginx -t
    sudo systemctl reload nginx

## 3. Verify
    curl -s https://YOURDOMAIN/ | grep -Ei 'og:|twitter:|<title>'

You should see og:title / og:description / og:image reflecting your admin
settings. Note: messaging apps cache previews — use a fresh link or a preview
debugger (e.g. https://www.opengraph.xyz/) to see updates immediately.
