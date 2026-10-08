// landing.js

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Initialize Parallax Effect
    initParallax();

    // 2. Fetch and render real dynamic metrics from backend
    fetchRealMetrics();
});

/**
 * Initializes the layered parallax effect on the Hero section
 */
function initParallax() {
    const layers = document.querySelectorAll('.parallax-layer');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || layers.length === 0) {
        return; // Disable for accessibility or missing elements
    }

    let rafId;

    const onScroll = () => {
        const scrollY = window.scrollY;
        
        // Only animate if hero is in view (rough optimization)
        if (scrollY > window.innerHeight) return;

        layers.forEach(layer => {
            const speed = parseFloat(layer.getAttribute('data-speed')) || 0.5;
            // Negative value moves it up slightly as we scroll down
            const yPos = -(scrollY * speed); 
            layer.style.transform = `translate3d(0, ${yPos}px, 0)`;
        });
    };

    const handleScroll = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(onScroll);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
}

/**
 * Fetches real metrics from the backend and populates the performance section
 */
async function fetchRealMetrics() {
    const statsContainer = document.getElementById('landing-stats');
    if (!statsContainer) return;

    try {
        // Wait for ApiService to be available if loaded asynchronously
        if (typeof window.ApiService === 'undefined') {
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const data = await window.ApiService.getDashboardData();
        
        // Format the accuracy to a percentage string
        const accuracyPct = data.accuracy ? (data.accuracy * 100).toFixed(2) + '%' : 'N/A';
        
        // Render exact required metrics (Avoid fabricating any)
        statsContainer.innerHTML = `
            <div class="metric-box">
                <span class="metric-value">${accuracyPct}</span>
                <span class="metric-label">Test Accuracy</span>
            </div>
            <div class="metric-box">
                <span class="metric-value">${data.dataset_size ? data.dataset_size.toLocaleString() : 'N/A'}</span>
                <span class="metric-label">Training Images</span>
            </div>
            <div class="metric-box">
                <span class="metric-value">${data.classes ? data.classes.length : 'N/A'}</span>
                <span class="metric-label">Disease Classes</span>
            </div>
            <div class="metric-box">
                <span class="metric-value">${data.input_resolution || 'N/A'}</span>
                <span class="metric-label">Input Resolution</span>
            </div>
        `;
        
    } catch (error) {
        console.error("Failed to load metrics on landing page:", error);
        statsContainer.innerHTML = `
            <div class="metric-box" style="grid-column: 1 / -1; color: var(--chilli-red);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                <span class="metric-label">System Offline</span>
            </div>
        `;
    }
}
