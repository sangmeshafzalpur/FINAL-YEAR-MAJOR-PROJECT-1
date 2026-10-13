/**
 * config.js
 * Runtime API Configuration for ChilliFusionNet Frontend
 *
 * PURPOSE:
 * ─────────────────────────────────────────────────────────────────────────────
 * This file sets window.__API_BASE_URL, which is read by api.js.
 * It allows the frontend to work in both development and production
 * without rebuilding or changing api.js.
 *
 * HOW IT WORKS:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. During LOCAL DEVELOPMENT:
 *    This file ships with API_BASE_URL pointing to http://localhost:8000.
 *    No changes needed — just start the backend and open index.html.
 *
 * 2. During NETLIFY PRODUCTION:
 *    Netlify's build environment injects the environment variable
 *    API_BASE_URL (set in Netlify → Site Settings → Environment Variables).
 *    The netlify.toml build command runs `node scripts/inject-config.js`
 *    which replaces the placeholder below with the real Render URL before
 *    the frontend is published.
 *
 *    Alternatively (simpler, no build step): replace the placeholder string
 *    below with your Render URL during Netlify's build using sed:
 *
 *      sed -i "s|__PLACEHOLDER_API_URL__|$API_BASE_URL|g" frontend/js/config.js
 *
 * IMPORTANT:
 * ─────────────────────────────────────────────────────────────────────────────
 * NEVER put secret keys or credentials here.
 * This file is served publicly to all users.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
    // Detect environment automatically based on hostname
    var hostname = window.location.hostname;

    var API_BASE_URL;

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
        // LOCAL DEVELOPMENT
        API_BASE_URL = 'http://localhost:8000';
    } else {
        // PRODUCTION — replaced by the Netlify build step (see netlify.toml)
        // The placeholder below is replaced during CI/CD with the real Render URL.
        API_BASE_URL = '__PLACEHOLDER_API_URL__';
    }

    window.__API_BASE_URL = API_BASE_URL;

    if (typeof console !== 'undefined') {
        console.info('[ChilliFusionNet] API Base URL:', API_BASE_URL);
    }
})();
