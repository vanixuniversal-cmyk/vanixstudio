/* ==========================================================================
   VANIX STUDIO GLOBAL JAVASCRIPT (js/main.js)
   Centralized interactions, responsive navigations, animations, and particle effects.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ════════ 1. PRELOADER / LOADER SCREEN ════════
    const loader = document.getElementById('loader');
    if (loader) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 1800); // 1.8s duration matching CSS fills
        });
        
        // Fallback in case load event takes too long
        setTimeout(() => {
            if (!loader.classList.contains('hidden')) {
                loader.classList.add('hidden');
            }
        }, 5000);
    }

    // ════════ 2. SMOOTH GLOWING CUSTOM CURSOR (DELETED) ════════
    // Custom cursor features have been removed to use the standard system cursor.

    // ════════ 3. NAVBAR SCROLL ACTION ════════
    const navbar = document.getElementById('navbar');
    if (navbar) {
        const checkScroll = () => {
            if (window.scrollY > 40) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        };
        
        window.addEventListener('scroll', checkScroll);
        checkScroll(); // Run initially in case page loaded mid-scroll
    }

    // ════════ 4. SCROLL PROGRESS INDICATOR ════════
    const scrollBarFill = document.getElementById('scrollBar') || document.querySelector('.scroll-progress');
    if (scrollBarFill) {
        window.addEventListener('scroll', () => {
            const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (windowHeight > 0) {
                const scrolledFraction = (window.scrollY / windowHeight) * 100;
                scrollBarFill.style.width = `${scrolledFraction}%`;
            }
        });
    }

    // ════════ 5. BACK-TO-TOP TRIGGER ════════
    const backTop = document.getElementById('backTop') || document.getElementById('backToTop');
    if (backTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                backTop.classList.add('show');
            } else {
                backTop.classList.remove('show');
            }
        });
        
        backTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // ════════ 6. INTERSECTION OBSERVER FOR REVEAL ANIMATIONS ════════
    const revealElements = document.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale');
    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    // Stop observing once animation has triggered
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            threshold: 0.08, // Trigger when 8% is visible
            rootMargin: '0px 0px -40px 0px' // Adjust lower bounds to trigger nicely
        });
        
        revealElements.forEach(el => revealObserver.observe(el));
    }

    // ════════ 7. RESPONSIVE MOBILE NAVIGATION ════════
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    
    if (hamburger && navLinks) {
        const toggleMenu = () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
            // Prevent body scroll when menu is active on mobile
            if (navLinks.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        };
        
        hamburger.addEventListener('click', toggleMenu);
        
        // Close menu when clicking on any navigation link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (navLinks.classList.contains('active')) {
                    toggleMenu();
                }
            });
        });
        
        // Close menu when clicking outside of it
        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') && 
                !navLinks.contains(e.target) && 
                !hamburger.contains(e.target)) {
                toggleMenu();
            }
        });
    }

    // ════════ 8. HIGH-PERFORMANCE GLOBAL PARTICLES SIMULATION ════════
    const canvas = document.getElementById('particlesCanvas') || document.querySelector('.particles-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;
        
        // Handle window resizing
        window.addEventListener('resize', () => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
            createParticles();
        });
        
        class Particle {
            constructor() {
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                this.size = Math.random() * 2 + 1; // Size 1px to 3px
                this.speedY = -(Math.random() * 0.4 + 0.1); // Move upward
                this.speedX = (Math.random() * 0.3 - 0.15); // Slight drift
                this.opacity = Math.random() * 0.5 + 0.2; // 0.2 to 0.7 opacity
                this.pulseSpeed = Math.random() * 0.01 + 0.005;
                this.pulseDir = Math.random() > 0.5 ? 1 : -1;
            }
            
            update() {
                this.y += this.speedY;
                this.x += this.speedX;
                
                // Wrap around screen bounds
                if (this.y < -10) {
                    this.y = h + 10;
                    this.x = Math.random() * w;
                }
                if (this.x < -10) this.x = w + 10;
                if (this.x > w + 10) this.x = -10;
                
                // Opacity pulse effect for organic twinkling
                this.opacity += this.pulseSpeed * this.pulseDir;
                if (this.opacity > 0.8) {
                    this.opacity = 0.8;
                    this.pulseDir = -1;
                } else if (this.opacity < 0.2) {
                    this.opacity = 0.2;
                    this.pulseDir = 1;
                }
            }
            
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                
                let colorRGB = '255, 0, 0';
                if (document.body.classList.contains('theme-cyan')) {
                    colorRGB = '0, 240, 255';
                } else if (document.body.classList.contains('theme-purple')) {
                    colorRGB = '189, 0, 255';
                }
                
                ctx.fillStyle = `rgba(${colorRGB}, ${this.opacity})`;
                ctx.shadowBlur = this.size * 3;
                ctx.shadowColor = `rgba(${colorRGB}, 0.7)`;
                ctx.fill();
            }
        }
        
        function createParticles() {
            particles = [];
            // Scale number of particles by viewport size for responsive performance
            // Use fewer particles on mobile to reduce CPU usage
            const isMobile = window.innerWidth < 768;
            const density = Math.floor((w * h) / 35000);
            const maxParticles = isMobile ? 30 : 60;
            const particleCount = Math.min(density, maxParticles);
            
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        }
        
        // Initialize particle simulation
        createParticles();
        
        let animFrameId = null;
        function animateParticles() {
            ctx.clearRect(0, 0, w, h);
            ctx.shadowBlur = 0;
            for (const p of particles) {
                p.update();
                p.draw();
            }
            animFrameId = requestAnimationFrame(animateParticles);
        }
        
        // Pause animation when tab is hidden to save CPU/battery
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (animFrameId) cancelAnimationFrame(animFrameId);
            } else {
                animateParticles();
            }
        });
        
        animateParticles();
    }

    // ════════ 9. DYNAMIC AUTH NAV STATUS ════════
    // Sync session from localStorage to sessionStorage if needed
    const activeSessionStr = localStorage.getItem('vanix_active_session');
    if (activeSessionStr) {
        try {
            const activeSession = JSON.parse(activeSessionStr);
            if (activeSession && activeSession.token) {
                if (activeSession.role === 'user') {
                    sessionStorage.setItem('user_token', activeSession.token);
                    sessionStorage.setItem('user_name', activeSession.name || '');
                    sessionStorage.setItem('user_email', activeSession.email || '');
                } else if (activeSession.role === 'employee') {
                    sessionStorage.setItem('emp_token', activeSession.token);
                    sessionStorage.setItem('emp_name', activeSession.name || '');
                    sessionStorage.setItem('emp_email', activeSession.email || '');
                } else if (activeSession.role === 'super_admin') {
                    sessionStorage.setItem('sa_token', activeSession.token);
                    sessionStorage.setItem('sa_email', activeSession.email || '');
                }
            }
        } catch (e) {
            console.error('Failed to sync session from localStorage', e);
        }
    }

    // Cross-tab logout synchronization
    window.addEventListener('storage', (e) => {
        if (e.key === 'vanix_active_session' && !e.newValue) {
            // Clear current sessionStorage
            const sessionKeys = ['user_token', 'user_name', 'user_email', 'emp_token', 'emp_name', 'emp_email', 'sa_token', 'sa_email'];
            sessionKeys.forEach(k => sessionStorage.removeItem(k));
            window.location.reload();
        }
    });

    const isUserLoggedIn = sessionStorage.getItem('user_token') || sessionStorage.getItem('emp_token') || sessionStorage.getItem('sa_token')
        || localStorage.getItem('vanix_token');
    if (isUserLoggedIn) {
        document.querySelectorAll('.nav-cta').forEach(btn => {
            btn.textContent = 'LOGOUT';
            btn.setAttribute('href', '#');
            btn.style.background = 'linear-gradient(135deg, var(--primary-dark), var(--primary-dark))';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Clear ALL possible token storage locations (localStorage + sessionStorage)
                const sessionKeys = ['user_token', 'user_name', 'user_email', 'emp_token', 'emp_name', 'emp_email', 'sa_token', 'sa_email'];
                const localKeys = ['vanix_token', 'vanix-theme', 'vanix_active_session'];
                sessionKeys.forEach(k => sessionStorage.removeItem(k));
                localKeys.forEach(k => localStorage.removeItem(k));
                
                // If Firebase Auth is loaded, sign out from Firebase
                if (window.firebase && firebase.auth) {
                    try {
                        firebase.auth().signOut().then(() => {
                            window.location.href = window.location.pathname.includes('/pages/') ? '../login.html' : 'login.html';
                        }).catch(() => {
                            window.location.href = window.location.pathname.includes('/pages/') ? '../login.html' : 'login.html';
                        });
                        return;
                    } catch (err) {
                        console.error(err);
                    }
                }
                
                window.location.href = window.location.pathname.includes('/pages/') ? '../login.html' : 'login.html';
            });
        });
    }

    // Dynamic Dashboard/Portal link for logged-in employees and super admins
    if (activeSessionStr) {
        try {
            const activeSession = JSON.parse(activeSessionStr);
            if (activeSession && (activeSession.role === 'employee' || activeSession.role === 'super_admin')) {
                const isInsidePages = window.location.pathname.includes('/pages/');
                const targetUrl = activeSession.role === 'super_admin'
                    ? (isInsidePages ? 'super-admin.html' : 'pages/super-admin.html')
                    : (isInsidePages ? 'employee-dashboard.html' : 'pages/employee-dashboard.html');

                document.querySelectorAll('.nav-cta').forEach(btn => {
                    const parent = btn.parentElement;
                    if (parent && !parent.parentElement.querySelector('.nav-portal-link')) {
                        const portalLi = document.createElement('li');
                        const portalLink = document.createElement('a');
                        portalLink.className = 'nav-portal-link';
                        portalLink.href = targetUrl;
                        portalLink.innerHTML = '⚡ PORTAL';
                        portalLink.style.cssText = `
                            background: rgba(var(--primary-rgb), 0.08);
                            border: 1px solid rgba(var(--primary-rgb), 0.3);
                            color: var(--primary);
                            padding: 8px 18px;
                            border-radius: 7px;
                            font-weight: 700;
                            letter-spacing: 1.5px;
                            text-decoration: none;
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            transition: all 0.3s ease;
                            margin-right: 12px;
                            font-family: 'Orbitron', sans-serif;
                            font-size: 11px;
                        `;
                        
                        portalLink.addEventListener('mouseenter', () => {
                            portalLink.style.background = 'var(--primary)';
                            portalLink.style.borderColor = 'var(--primary)';
                            portalLink.style.color = '#fff';
                            portalLink.style.boxShadow = '0 0 15px var(--primary-glow)';
                        });
                        portalLink.addEventListener('mouseleave', () => {
                            portalLink.style.background = 'rgba(var(--primary-rgb), 0.08)';
                            portalLink.style.borderColor = 'rgba(var(--primary-rgb), 0.3)';
                            portalLink.style.color = 'var(--primary)';
                            portalLink.style.boxShadow = 'none';
                        });

                        parent.parentElement.insertBefore(portalLi, parent);
                        portalLi.appendChild(portalLink);
                    }
                });
            }
        } catch (e) {
            console.error('Failed to inject portal link', e);
        }
    }


    // ════════ 10. GLOBAL CINEMATIC VIDEO MODAL ════════
    function initVideoModal() {
        const modal = document.createElement('div');
        modal.className = 'video-modal';
        modal.id = 'globalVideoModal';
        modal.innerHTML = `
            <div class="video-modal-container">
                <button class="video-modal-close" id="closeVideoModal">✕ CLOSE</button>
                <div id="videoModalFrameContainer" style="width:100%; height:100%;"></div>
            </div>
        `;
        document.body.appendChild(modal);

        const frameContainer = modal.querySelector('#videoModalFrameContainer');
        const closeBtn = modal.querySelector('#closeVideoModal');

        function openModal(videoUrl) {
            let embedUrl = videoUrl;
            
            // Format standard YouTube links into embed links
            if (videoUrl.includes('youtube.com/watch?v=')) {
                const videoId = videoUrl.split('v=')[1].split('&')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            } else if (videoUrl.includes('youtu.be/')) {
                const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            } else if (videoUrl.includes('vimeo.com/') && !videoUrl.includes('player.vimeo.com')) {
                const videoId = videoUrl.split('vimeo.com/')[1].split('?')[0];
                embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
            }

            // Create iframe or native video tag depending on file extension
            const isDirectVideo = videoUrl.endsWith('.mp4') || videoUrl.endsWith('.webm') || videoUrl.endsWith('.ogg');
            if (isDirectVideo) {
                frameContainer.innerHTML = '';
                const videoEl = document.createElement('video');
                videoEl.src = videoUrl;
                videoEl.controls = true;
                videoEl.autoplay = true;
                videoEl.style.width = '100%';
                videoEl.style.height = '100%';
                videoEl.style.objectFit = 'contain';
                frameContainer.appendChild(videoEl);
            } else {
                frameContainer.innerHTML = '';
                const iframeEl = document.createElement('iframe');
                iframeEl.src = embedUrl;
                iframeEl.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
                iframeEl.setAttribute('allowfullscreen', 'true');
                frameContainer.appendChild(iframeEl);
            }
            modal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling background
        }

        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            // Clear content to stop video/audio playback instantly
            setTimeout(() => {
                frameContainer.innerHTML = '';
            }, 500);
        }

        // Close events
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
        });

        // Wire up play triggers globally
        document.addEventListener('click', (e) => {
            // Find if clicked element or its parent is a video trigger card
            const trigger = e.target.closest('[data-video-url]');
            if (trigger) {
                e.preventDefault();
                const videoUrl = trigger.getAttribute('data-video-url');
                if (videoUrl) openModal(videoUrl);
            }
        });
    }
    initVideoModal();

    // ════════ 11. DYNAMIC CONTACT FORM SUBMISSION ════════
    const contactForm = document.querySelector('.contact-form-container form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = contactForm.querySelector('.btn-submit');
            const originalText = submitBtn ? submitBtn.textContent : 'SEND MESSAGE';
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'SENDING...';
            }
            
            // Extract values safely
            const nameInput = contactForm.querySelector('input[name="name"]') || contactForm.querySelector('input[placeholder="John Doe"]');
            const emailInput = contactForm.querySelector('input[name="email"]') || contactForm.querySelector('input[placeholder="john@example.com"]');
            const phoneInput = contactForm.querySelector('input[name="phone"]') || contactForm.querySelector('input[placeholder="+91 9553148093"]');
            const serviceSelect = contactForm.querySelector('select[name="service"]') || contactForm.querySelector('select');
            const detailsTextarea = contactForm.querySelector('textarea[name="details"]') || contactForm.querySelector('textarea');
            
            const payload = {
                name: nameInput ? nameInput.value.trim() : '',
                email: emailInput ? emailInput.value.trim() : '',
                phone: phoneInput ? phoneInput.value.trim() : '',
                service: serviceSelect ? serviceSelect.value : '',
                details: detailsTextarea ? detailsTextarea.value.trim() : ''
            };
            
            if (!payload.name || !payload.email || !payload.details) {
                alert('Please fill out Name, Email and Project Details fields.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
                return;
            }
            
            try {
                // Submit to backend contact API base resolved from window.API_BASE (api-config.js)
                const apiBase = window.API_BASE || '';
                const response = await fetch(`${apiBase}/api/auth/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || 'Failed to submit form');
                }
                
                // Show stunning success toast
                showToastNotification('✉ Message sent successfully! Our team will contact you shortly.', 'success');
                
                // Clear the form fields safely
                contactForm.reset();
            } catch (err) {
                console.error(err);
                showToastNotification(`✕ Error: ${err.message}`, 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    }

    // Helper for beautiful floating toast notifications on public pages
    function showToastNotification(message, type = '') {
        let toastEl = document.getElementById('publicToast');
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'publicToast';
            toastEl.style.cssText = `
                position: fixed;
                bottom: 30px;
                right: 30px;
                background: rgba(10, 10, 10, 0.95);
                border: 1px solid rgba(var(--primary-rgb), 0.3);
                border-radius: 12px;
                color: #fff;
                padding: 16px 24px;
                font-family: 'Poppins', sans-serif;
                font-size: 13px;
                letter-spacing: 0.5px;
                box-shadow: 0 15px 40px rgba(var(--primary-rgb), 0.15);
                z-index: 99999;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                backdrop-filter: blur(10px);
            `;
            document.body.appendChild(toastEl);
        }
        
        toastEl.textContent = message;
        if (type === 'success') {
            toastEl.style.borderColor = '#00ff64';
            toastEl.style.boxShadow = '0 15px 40px rgba(0, 255, 100, 0.15)';
        } else {
            toastEl.style.borderColor = 'var(--primary)';
            toastEl.style.boxShadow = '0 15px 40px rgba(var(--primary-rgb), 0.15)';
        }
        
        // Trigger reflow/animation
        setTimeout(() => {
            toastEl.style.opacity = '1';
            toastEl.style.transform = 'translateY(0)';
        }, 50);
        
        setTimeout(() => {
            toastEl.style.opacity = '0';
            toastEl.style.transform = 'translateY(20px)';
        }, 4000);
    }

    // ════════ 12. DYNAMIC CYBERPUNK THEME SWITCHER ════════
    function initThemeSwitcher() {
        // Create trigger and panel
        const trigger = document.createElement('div');
        trigger.className = 'theme-hud-trigger';
        trigger.id = 'themeHudTrigger';
        trigger.innerHTML = `
            <span class="hud-pulse"></span>
            <span class="hud-icon">🎛️</span>
            <span class="hud-label">INTERFACE CONTROL</span>
        `;

        const panel = document.createElement('div');
        panel.className = 'theme-hud-panel';
        panel.id = 'themeHudPanel';
        panel.innerHTML = `
            <div class="hud-header">
                <h4>ACCENT PROTOCOL</h4>
                <button class="hud-close" id="themeHudClose">✕</button>
            </div>
            <div class="hud-divider"></div>
            <div class="theme-options">
                <button class="theme-opt crimson" data-theme="crimson">
                    <span class="theme-dot"></span> CRIMSON PROTOCOL
                </button>
                <button class="theme-opt cyan" data-theme="cyan">
                    <span class="theme-dot"></span> GRID CYAN
                </button>
                <button class="theme-opt purple" data-theme="purple">
                    <span class="theme-dot"></span> HYPER VOID
                </button>
            </div>
        `;

        document.body.appendChild(trigger);
        document.body.appendChild(panel);

        const closeBtn = panel.querySelector('#themeHudClose');
        const themeBtns = panel.querySelectorAll('.theme-opt');

        // Toggle panel active state
        trigger.addEventListener('click', () => {
            panel.classList.toggle('active');
        });

        closeBtn.addEventListener('click', () => {
            panel.classList.remove('active');
        });

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && !trigger.contains(e.target)) {
                panel.classList.remove('active');
            }
        });

        // Theme applying function
        function applyTheme(themeName) {
            // Remove previous theme classes
            document.body.classList.remove('theme-crimson', 'theme-cyan', 'theme-purple');
            // Add new theme class
            document.body.classList.add(`theme-${themeName}`);

            // Update active states in buttons
            themeBtns.forEach(btn => {
                const btnTheme = btn.getAttribute('data-theme');
                if (btnTheme === themeName) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Save to localStorage
            localStorage.setItem('vanix-theme', themeName);
        }

        // Add button event listeners
        themeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedTheme = btn.getAttribute('data-theme');
                applyTheme(selectedTheme);
                // Notify cloud-sync module so it can persist to the API
                document.dispatchEvent(new CustomEvent('vanix:theme-change', { detail: { theme: selectedTheme } }));
            });
        });

        // Load persisted theme
        const savedTheme = localStorage.getItem('vanix-theme') || 'crimson';
        applyTheme(savedTheme);
    }
    initThemeSwitcher();

    // ════════ 13. CINEMATIC PROGRESSIVE LAZY-LOADING ════════
    function initProgressiveLoading() {
        document.querySelectorAll('[data-progressive-bg]').forEach(el => {
            const highResUrl = el.getAttribute('data-progressive-bg');
            if (!highResUrl) return;

            // Apply starting blur and progressive class
            el.classList.add('progressive-bg');

            // Asynchronously load the high-res image
            const img = new Image();
            img.src = highResUrl;
            img.onload = () => {
                // Set the high-res background
                el.style.backgroundImage = `url('${highResUrl}')`;
                // Reveal smoothly
                el.classList.add('progressive-loaded');
                
                // Optional: remove classes after transition completes to keep DOM clean
                setTimeout(() => {
                    el.classList.remove('progressive-bg', 'progressive-loaded');
                }, 1300);
            };
        });
    }
    initProgressiveLoading();

    // ════════ 14. SMART ANALYTICS — page visit + time-on-page tracking ════════
    (function initAnalytics() {
        const pageEntryTime = Date.now();
        const API_BASE = window.API_BASE || window.API || '';

        function sendVisit(timeSpent) {
            const payload = {
                page: window.location.pathname,
                referrer: document.referrer || '',
                time_spent_seconds: Math.round(timeSpent / 1000)
            };
            const endpoint = `${API_BASE}/api/auth/visit`;
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            if (navigator.sendBeacon) {
                navigator.sendBeacon(endpoint, blob);
            } else {
                fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    keepalive: true
                }).catch(() => {});
            }
        }

        // Send on page exit with time spent
        window.addEventListener('pagehide', () => {
            sendVisit(Date.now() - pageEntryTime);
        });

        // Also send a quick beacon on entry (time_spent = 0) to count page views
        setTimeout(() => {
            fetch(`${API_BASE}/api/auth/visit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    page: window.location.pathname,
                    referrer: document.referrer || '',
                    time_spent_seconds: 0
                })
            }).catch(() => {});
        }, 500);
    })();


    // ════════ 15. CLOUD THEME SYNC — persist accent theme to DB for logged-in users ════════
    (function initCloudThemeSync() {
        const API_BASE = window.API_BASE || window.API || '';
        const token = localStorage.getItem('vanix_token');
        if (!token) return; // Not logged in — use localStorage only

        const authHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // On load: pull cloud theme and override localStorage if different
        fetch(`${API_BASE}/api/auth/me/theme`, { headers: authHeaders })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data && data.theme) {
                    const localTheme = localStorage.getItem('vanix-theme');
                    if (data.theme !== localTheme) {
                        // Cloud wins — apply and sync locally
                        localStorage.setItem('vanix-theme', data.theme);
                        // Trigger theme reapplication if switcher is already initialized
                        const themeEvent = new CustomEvent('vanix:theme-change', { detail: { theme: data.theme } });
                        document.dispatchEvent(themeEvent);
                    }
                }
            })
            .catch(() => {});

        // Listen for theme changes and push to cloud
        document.addEventListener('vanix:theme-change', (e) => {
            const theme = e.detail && e.detail.theme;
            if (!theme) return;
            fetch(`${API_BASE}/api/auth/me/theme`, {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify({ theme })
            }).catch(() => {});
        });
    })();

    // ════════ 16. ACTIVE NAV LINK HIGHLIGHTING ════════
    (function highlightActiveNav() {
        const currentFile = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-links a').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            const linkFile = href.split('/').pop();
            if (linkFile === currentFile) {
                link.classList.add('active-link');
            }
        });
    })();

    // ════════ 17. ANIMATED NUMBER COUNTERS ════════
    (function initCounters() {
        const counterEls = document.querySelectorAll('[data-count]');
        if (!counterEls.length) return;

        function easeOutExpo(t) {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        }

        function animateCounter(el) {
            const target = parseInt(el.getAttribute('data-count'), 10);
            const suffix = el.getAttribute('data-suffix') || '';
            const duration = 2000;
            const startTime = performance.now();

            function step(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const value = Math.round(easeOutExpo(progress) * target);
                el.textContent = value + suffix;
                if (progress < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }

        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counterEls.forEach(el => counterObserver.observe(el));
    })();

});

/* ==========================================================================
   ANTI-INSPECTION PROTOCOL
   Prevents right-click context menu, DevTools keyboard shortcuts, and Ctrl+U
   ========================================================================== */
(function() {
    // Disable Right Click Context Menu
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // Disable Common DevTools and View Source Shortcuts
    document.addEventListener('keydown', function(e) {
        // F12 key
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspect Element)
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+U (View Page Source)
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+S (Save Page)
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }
    });
})();
