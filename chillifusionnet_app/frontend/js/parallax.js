document.addEventListener('DOMContentLoaded', () => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
        console.log("Reduced motion enabled, disabling parallax.");
        return;
    }

    const hero = document.getElementById('hero');
    const layers = document.querySelectorAll('.parallax-layer, .parallax-content');
    
    // Mouse movement parallax
    hero.addEventListener('mousemove', (e) => {
        // Calculate mouse position relative to center of screen
        const x = (e.clientX - window.innerWidth / 2) / 100;
        const y = (e.clientY - window.innerHeight / 2) / 100;

        layers.forEach(layer => {
            const speed = parseFloat(layer.getAttribute('data-speed')) || 0.5;
            // Reverse direction for content layer to create depth
            const dir = layer.classList.contains('parallax-content') ? -1 : 1;
            const xOffset = x * speed * dir;
            const yOffset = y * speed * dir;

            layer.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
        });
    });

    // Reset on mouse leave
    hero.addEventListener('mouseleave', () => {
        layers.forEach(layer => {
            layer.style.transform = `translate(0px, 0px)`;
            layer.style.transition = 'transform 0.5s ease-out';
        });
        
        setTimeout(() => {
            layers.forEach(layer => {
                layer.style.transition = 'none';
            });
        }, 500);
    });

    // Scroll parallax
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        
        // Only animate if hero is in view
        if (scrollY <= hero.offsetHeight) {
            layers.forEach(layer => {
                const speed = parseFloat(layer.getAttribute('data-speed')) || 0.5;
                // Elements move up at different speeds relative to scroll
                const yOffset = scrollY * speed * 0.5;
                
                // If the layer already has a mouse-driven transform, this will overwrite it during scroll,
                // which is acceptable for a smooth scroll effect. For a perfect combination, 
                // we would need a requestAnimationFrame loop combining both vectors, but keeping it
                // simple here prevents layout thrashing.
                
                // For the content, we just let it scroll normally or add slight parallax
                if (layer.classList.contains('parallax-content')) {
                    layer.style.transform = `translateY(${yOffset * 0.2}px)`;
                } else {
                    layer.style.transform = `translateY(${yOffset}px)`;
                }
            });
        }
    });
});
