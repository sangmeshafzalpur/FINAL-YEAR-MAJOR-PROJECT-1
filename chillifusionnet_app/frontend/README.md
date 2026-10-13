# ChilliFusionNet Frontend

Multi-page web application for the ChilliFusionNet chilli leaf disease detection system.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Structure | Plain HTML5 |
| Styling | Vanilla CSS (no framework) |
| Logic | Vanilla JavaScript (ES2020+) |
| Fonts | Google Fonts (Inter, Outfit) |
| Icons | Font Awesome 6 |
| Deployment | Netlify (static site hosting) |

## Pages

| File | Description |
|------|-------------|
| `index.html` | Landing page with hero, pipeline, disease classes, features |
| `diagnosis.html` | Upload → Predict → Grad-CAM results (single + batch) |
| `dashboard.html` | Model performance metrics and dataset statistics |
| `reports.html` | Saved diagnosis history and deep evaluation reports |
| `model.html` | Model architecture and technical details |
| `about.html` | Project information |

## Directory Structure

```
frontend/
├── index.html
├── diagnosis.html
├── dashboard.html
├── reports.html
├── model.html
├── about.html
├── components/
│   ├── navbar.html      # Injected by app.js into every page
│   ├── footer.html
│   └── loader.html
├── css/
│   ├── style.css        # Global design tokens, utilities, layout
│   ├── animations.css   # Scroll-reveal, micro-animations
│   ├── landing.css      # Landing page specific styles
│   ├── diagnosis.css    # Diagnosis page specific styles
│   ├── dashboard.css
│   ├── reports.css
│   ├── model.css
│   ├── about.css
│   └── responsive.css   # Breakpoints for mobile/tablet/desktop
├── js/
│   ├── config.js        # ← API base URL injection (edit for local dev)
│   ├── api.js           # Centralized API communication service
│   ├── app.js           # Component loader, navbar, scroll-reveal
│   ├── diagnosis.js     # Diagnosis page logic
│   ├── dashboard.js     # Dashboard charts and metrics
│   ├── reports.js       # Reports page logic
│   ├── model.js         # Model page logic
│   └── landing.js       # Landing page animations
└── assets/
    ├── images/
    ├── icons/
    └── logos/
```

## Local Development

No build step required. Just open the HTML files with a local web server.

### Option 1 — VS Code Live Server (recommended)

1. Install the "Live Server" extension in VS Code
2. Right-click `frontend/index.html` → "Open with Live Server"
3. The site opens at `http://127.0.0.1:5500`

### Option 2 — Python HTTP server

```powershell
# From the chillifusionnet_app/ directory
cd frontend
python -m http.server 3000
# Open: http://localhost:3000
```

### Option 3 — Node http-server

```powershell
npx -y http-server frontend -p 3000
# Open: http://localhost:3000
```

## API URL Configuration

The API base URL is set in `js/config.js`.

For **local development**, the default is already correct:
```js
API_BASE_URL = 'http://localhost:8000';   // auto-detected by hostname
```

For **production (Netlify)**, the Netlify build step injects your Render URL
by running:
```bash
sed -i "s|__PLACEHOLDER_API_URL__|${API_BASE_URL}|g" frontend/js/config.js
```
You set `API_BASE_URL` in Netlify's Environment Variables dashboard.

**Never hardcode production URLs in committed files.**

## Netlify Deployment

### First-time setup

1. Push your repository to GitHub.
2. Log in to [netlify.com](https://netlify.com) → "Add new site" → "Import from Git".
3. Select your GitHub repository.
4. Netlify will read `chillifusionnet_app/netlify.toml` automatically.
5. Go to **Site configuration → Environment variables** → Add:

   | Variable | Value |
   |----------|-------|
   | `API_BASE_URL` | `https://YOUR-RENDER-SERVICE.onrender.com` |

6. Click **Deploy site**.

### Subsequent deploys

Push to the `main` branch — Netlify deploys automatically.

## Troubleshooting

**Blank page / "Failed to load component":**
- Open browser DevTools → Console tab
- Check for CORS or network errors
- Ensure the backend is running at the configured URL

**"Backend connection unavailable" message:**
- Render free tier spins down after 15 min of inactivity; wait 30 seconds and retry
- Check the `API_BASE_URL` in Netlify environment variables

**API_BASE_URL not being injected on Netlify:**
- Verify `API_BASE_URL` is set in Netlify → Site configuration → Environment variables
- Check the Netlify build log for the `sed` command output
- Ensure `netlify.toml` base is set to `chillifusionnet_app`

**404 on static assets (CSS/JS/images):**
- Verify that `publish = "frontend"` in `netlify.toml`
- Check all file paths are relative (no leading `/` in HTML links)
