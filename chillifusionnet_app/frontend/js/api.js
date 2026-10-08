/**
 * api.js
 * Centralized API Communication Service for ChilliFusionNet
 */

class ApiService {
    static get API_BASE_URL() {
        return 'http://localhost:8000'; // Configurable Base URL
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
                        // Prevent exposing raw python stack traces if present
                        if (String(errorData.detail).includes('Traceback')) {
                            errorMsg = 'An internal server error occurred.';
                        } else {
                            errorMsg = errorData.detail;
                        }
                    }
                } catch (e) {
                    // Response is not JSON
                }
                throw new Error(errorMsg);
            }
            
            try {
                return await response.json();
            } catch (e) {
                throw new Error("Received malformed JSON from server.");
            }
            
        } catch (error) {
            // If it's a network error (fetch failed entirely)
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                console.error(`[API Error] ${url}: Backend connection unavailable.`);
                throw new Error("Backend connection unavailable.");
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
        if (!imageFiles || imageFiles.length === 0) throw new Error("No images provided.");
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
