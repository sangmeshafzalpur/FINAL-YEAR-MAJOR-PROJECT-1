// app.js
// Main Application Logic for ChilliFusionNet

/**
 * Dynamically fetches and inserts HTML components.
 */
async function loadComponent(elementId, componentPath) {
    const el = document.getElementById(elementId);
    if (!el) return;

    try {
        const response = await fetch(`components/${componentPath}`);
        if (!response.ok) throw new Error(`Failed to load ${componentPath}`);
        const html = await response.text();
        el.innerHTML = html;

        // If we just loaded the navbar, initialize its interactions
        if (componentPath === 'navbar.html') {
            initNavbarInteractions();
        }
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

/**
 * Initializes IntersectionObserver for scroll-reveal animations.
 */
function initScrollReveals() {
    const revealElements = document.querySelectorAll('.reveal');
    
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        revealElements.forEach(el => el.classList.add('active'));
        return;
    }

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: Stop observing once revealed
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        threshold: 0.1, // Trigger when 10% visible
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });
}

/**
 * Initializes Navbar Scroll Effects and Mobile Menu
 */
function initNavbarInteractions() {
    const navbar = document.getElementById('global-navbar');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    // Scroll Effect
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.remove('bg-transparent', 'border-transparent');
                navbar.classList.add('bg-dark-bg/90', 'backdrop-blur-md', 'border-gray-800', 'shadow-lg');
            } else {
                navbar.classList.add('bg-transparent', 'border-transparent');
                navbar.classList.remove('bg-dark-bg/90', 'backdrop-blur-md', 'border-gray-800', 'shadow-lg');
            }
        });
        
        // Trigger once on load in case page is already scrolled down
        window.dispatchEvent(new Event('scroll'));
    }

    // Mobile Menu Toggle
    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            const isExpanded = !mobileMenu.classList.contains('hidden');
            mobileBtn.setAttribute('aria-expanded', isExpanded);
        });
    }

    // Highlight Active Link
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Global Components
    await loadComponent('navbar-container', 'navbar.html');
    await loadComponent('footer-container', 'footer.html');
    
    // Load optional loader if container exists
    if (document.getElementById('loader-container')) {
        await loadComponent('loader-container', 'loader.html');
    }

    // 2. Initialize global animations
    // Use a small timeout to allow DOM to settle after dynamic insertions
    setTimeout(() => {
        initScrollReveals();
    }, 100);
});
