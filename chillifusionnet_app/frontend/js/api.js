/**
 * api.js
 * Centralized API Communication Service for ChilliFusionNet
 *
 * DEPLOYMENT CONFIGURATION:
 * ─────────────────────────────────────────────────────────────────────────────
 * The API base URL is resolved from the window-level constant
 * window.__API_BASE_URL, which is injected by config.js at runtime.
 *
 * Local development  → http://localhost:8000   (default in config.js)
 * Netlify production → set VITE_API_BASE_URL (or API_BASE_URL) env variable
 *                      and rebuild, OR inject via Netlify's _headers / snippet.
 *
 * NEVER hardcode a production URL in this file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

class ApiService {
    /**
     * Returns the resolved API base URL.
     * Priority order:
     *  1. window.__API_BASE_URL  (set by config.js or Netlify snippet injection)
     *  2. Falls back to empty string so all fetches are relative (useful for
     *     same-origin proxied deployments, though not used here).
     */
    static get API_BASE_URL() {
        return (typeof window !== 'undefined' && window.__API_BASE_URL)
            ? window.__API_BASE_URL.replace(/\/$/, '')   // strip trailing slash
            : '';
    }

    /**
     * Standardized internal fetch wrapper with error handling.
     */
    static async _fetch(endpoint, options = {}) {
        const url = `${this.API_BASE_URL}${endpoint}`;

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData.detail) {
                        // Prevent exposing raw Python stack traces if present
                        if (String(errorData.detail).includes('Traceback')) {
                            errorMsg = 'An internal server error occurred.';
                        } else {
                            errorMsg = errorData.detail;
                        }
                    }
                } catch (e) {
                    // Response is not JSON — keep original message
                }
                throw new Error(errorMsg);
            }

            try {
                return await response.json();
            } catch (e) {
                throw new Error('Received malformed JSON from server.');
            }

        } catch (error) {
            // Network failure (fetch failed entirely — CORS / server down)
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                console.error(`[API Error] ${url}: Backend connection unavailable.`);
                throw new Error('Backend connection unavailable. Please check if the server is running.');
            }
            console.error(`[API Error] ${url}:`, error.message);
            throw error;
        }
    }

    static async checkHealth() {
        return this._fetch('/health');
    }

    static async getConfig() {
        try {
            return await this._fetch('/api/config');
        } catch (e) {
            // Return safe defaults so the UI still functions when backend is cold-starting
            return {
                max_batch_size: 20,
                max_file_size_mb: 10,
                allowed_extensions: ['.bmp', '.jpeg', '.jpg', '.png', '.webp']
            };
        }
    }

    static async diagnoseImage(imageFile) {
        return this.diagnoseBatch([imageFile]);
    }

    static async diagnoseBatch(imageFiles) {
        if (!imageFiles || imageFiles.length === 0) throw new Error('No images provided.');
        const formData = new FormData();
        for (const file of imageFiles) {
            formData.append('files', file);
        }

        return this._fetch('/api/diagnose', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });
    }

    static async getDashboardData() {
        return this._fetch('/api/dashboard');
    }

    static async getModelInfo() {
        return this._fetch('/api/model-info');
    }

    static async getReportsData() {
        return this._fetch('/api/reports');
    }

    static async getSavedReports() {
        return this._fetch('/api/reports/saved');
    }

    static async getSavedReport(reportId) {
        return this._fetch(`/api/reports/saved/${reportId}`);
    }

    static async saveReport(reportData) {
        return this._fetch('/api/reports/save', {
            method: 'POST',
            body: JSON.stringify(reportData),
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
    }
}

window.ApiService = ApiService;
