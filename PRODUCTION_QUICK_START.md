# Production Deployment Quick Reference

## 1. Build Frontend for Production

```bash
cd frontend
npm run build
```

**Output:** `frontend/dist/` directory with optimized production files

---

## 2. Nginx Configuration Files

Two configuration files have been created in the `nginx/` directory:

### `nginx/frontend.conf` - Frontend Server
- Serves React SPA from `/var/www/cronhooks/frontend/dist`
- Placeholder: `server_name YOUR_DOMAIN_HERE;`
- Example: `server_name cronhooks.example.com;`

### `nginx/backend.conf` - Backend API Server
- Proxies to Django/Gunicorn on `127.0.0.1:8000`
- Placeholder: `server_name api.YOUR_DOMAIN_HERE;`
- Example: `server_name api.cronhooks.example.com;`

**Deploy nginx configs:**
```bash
# Copy configs
sudo cp nginx/frontend.conf /etc/nginx/sites-available/cronhooks-frontend
sudo cp nginx/backend.conf /etc/nginx/sites-available/cronhooks-backend

# Edit placeholders
sudo sed -i 's/YOUR_DOMAIN_HERE/cronhooks.example.com/g' /etc/nginx/sites-available/cronhooks-frontend
sudo sed -i 's/api.YOUR_DOMAIN_HERE/api.cronhooks.example.com/g' /etc/nginx/sites-available/cronhooks-backend

# Enable sites
sudo ln -s /etc/nginx/sites-available/cronhooks-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/cronhooks-backend /etc/nginx/sites-enabled/

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

---

## 3. SSL Certificate Commands

### Manual Command

**Single domain:**
```bash
sudo certbot --nginx -d cronhooks.example.com
```

**Multiple domains:**
```bash
sudo certbot --nginx -d cronhooks.example.com -d api.cronhooks.example.com
```

**With all options:**
```bash
sudo certbot --nginx \
  -d cronhooks.example.com \
  -d api.cronhooks.example.com \
  --non-interactive \
  --agree-tos \
  --email admin@example.com
```

### Using the Setup Script

An interactive script has been created: `setup_ssl.sh`

```bash
sudo ./setup_ssl.sh
```

This script will:
1. Check if certbot is installed (install if needed)
2. Prompt for frontend and backend domains
3. Prompt for notification email
4. Test nginx configuration
5. Generate SSL certificates automatically
6. Configure auto-renewal

---

## Command Summary

| Task | Command |
|------|---------|
| **Build frontend** | `cd frontend && npm run build` |
| **Install certbot** | `sudo apt install certbot python3-certbot-nginx` |
| **Generate SSL (interactive)** | `sudo ./setup_ssl.sh` |
| **Generate SSL (manual)** | `sudo certbot --nginx -d example.com -d api.example.com` |
| **Test auto-renewal** | `sudo certbot renew --dry-run` |
| **List certificates** | `sudo certbot certificates` |
| **Renew certificates** | `sudo certbot renew` |
| **Test nginx config** | `sudo nginx -t` |
| **Reload nginx** | `sudo systemctl reload nginx` |

---

## File Structure

```
Cronehooks-clone/
├── nginx/
│   ├── frontend.conf      # Frontend nginx config (HTTP only)
│   └── backend.conf       # Backend nginx config (HTTP only)
├── frontend/
│   ├── dist/             # Production build output (after npm run build)
│   └── package.json      # Contains "build" script
├── setup_ssl.sh          # Interactive SSL setup script
└── DEPLOYMENT_GUIDE.md   # Complete deployment documentation
```

---

## Notes

- **HTTP configs:** The nginx configs are HTTP-only. Certbot will automatically add HTTPS configuration.
- **Placeholders:** Remember to replace `YOUR_DOMAIN_HERE` in the nginx configs with your actual domains.
- **Auto-renewal:** Certbot automatically sets up a systemd timer for certificate renewal.
- **Firewall:** Ensure ports 80 and 443 are open in your firewall.
- **DNS:** Make sure your domains point to your server's IP address before running certbot.

---

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
