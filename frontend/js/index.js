/* ==========================================================================
   VANIX STUDIO HOME PAGE SCRIPT (js/index.js)
   Custom parallax, interactive tilts, magnetic buttons, and counter triggers.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ════════ 1. STATS COUNTER ANIMATION ════════
    let counterAnimated = false;

    function animateCounters() {
        if (counterAnimated) return;
        const counters = document.querySelectorAll('.hero-stat-number[data-count]');
        const heroStats = document.querySelector('.hero-stats');
        if (!heroStats) return;

        const rect = heroStats.getBoundingClientRect();
        // Check if the stats element is visible in the viewport
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            counterAnimated = true;
            counters.forEach(counter => {
                const target = parseInt(counter.getAttribute('data-count'), 10);
                const labelElement = counter.closest('.hero-stat').querySelector('.hero-stat-label');
                const isSatisfaction = labelElement && labelElement.textContent.includes('Satisfaction');
                const suffix = isSatisfaction ? '%' : '+';
                
                let current = 0;
                const increment = target / 60; // Animate over roughly 60 frames (1.5s at 40fps)
                
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    counter.textContent = Math.floor(current) + suffix;
                }, 25);
            });
        }
    }

    window.addEventListener('scroll', animateCounters);
    animateCounters(); // Run once in case already scrolled to stats

    // ════════ 2. SMOOTH PARALLAX FOR HERO CONTENT ════════
    window.addEventListener('scroll', () => {
        const heroContent = document.querySelector('.hero-content');
        if (heroContent && window.scrollY < window.innerHeight) {
            const opacity = 1 - (window.scrollY / (window.innerHeight * 0.7));
            const translateY = window.scrollY * 0.4;
            heroContent.style.opacity = Math.max(0, opacity);
            heroContent.style.transform = `translateY(${translateY}px)`;
        }
    });

    // ════════ 3. PARALLAX ON SHOWCASE IMAGES ════════
    const showcaseImg = document.getElementById('showcaseImg');
    const stripImg = document.getElementById('stripImg');

    function applyShowcaseParallax() {
        [showcaseImg, stripImg].forEach(img => {
            if (!img) return;
            const rect = img.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const scrollPercent = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
                const translateY = (scrollPercent - 0.5) * 60; // Translate +/- 30px
                img.style.transform = `translateY(${translateY}px) scale(1.05)`;
            }
        });
    }

    window.addEventListener('scroll', applyShowcaseParallax);

    // ════════ 4. 3D TILT EFFECT ON CARDS ════════
    const tiltElements = document.querySelectorAll('.service-card, .tech-card, .production-card, .lab-card, .service-mega-card, .why-card, .pricing-card');
    
    // Disable on touch devices to avoid interference with scrolling
    if (window.matchMedia('(hover: hover)').matches) {
        tiltElements.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left; // Mouse x position inside card
                const y = e.clientY - rect.top;  // Mouse y position inside card
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                // Rotation angles based on position (capped at +/- 10 degrees)
                const rotateX = (y - centerY) / 20;
                const rotateY = (centerX - x) / 20;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-12px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
            });
        });
    }

    // ════════ 5. MICRO-MAGNETIC INTERACTIVE BUTTON PHYSICS ════════
    const magneticBtns = document.querySelectorAll('.btn-primary, .btn-secondary, .nav-cta');
    
    if (window.matchMedia('(hover: hover)').matches) {
        magneticBtns.forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                // Pull button slightly towards the cursor (15% offset weight)
                btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) scale(1.02)`;
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translate(0, 0) scale(1)';
            });
        });
    }
});
