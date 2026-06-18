// Active Session Detection & Redirect
(function checkAndRedirectActiveSession() {
    const activeSessionStr = localStorage.getItem('vanix_active_session');
    if (activeSessionStr) {
        try {
            const activeSession = JSON.parse(activeSessionStr);
            if (activeSession && activeSession.token) {
                if (activeSession.role === 'user') {
                    sessionStorage.setItem('user_token', activeSession.token);
                    sessionStorage.setItem('user_name', activeSession.name || '');
                    sessionStorage.setItem('user_email', activeSession.email || '');
                    window.location.href = 'index.html';
                } else if (activeSession.role === 'employee') {
                    sessionStorage.setItem('emp_token', activeSession.token);
                    sessionStorage.setItem('emp_name', activeSession.name || '');
                    sessionStorage.setItem('emp_email', activeSession.email || '');
                    window.location.href = 'index.html';
                } else if (activeSession.role === 'super_admin') {
                    sessionStorage.setItem('sa_token', activeSession.token);
                    sessionStorage.setItem('sa_email', activeSession.email || '');
                    window.location.href = 'index.html';
                }
            }
        } catch (e) {
            console.error('Active session check failed', e);
        }
    }
})();

// Loading Screen
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 2000);
});

// Cursor Glow
const cursorGlow = document.getElementById('cursorGlow');
let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});
function animateCursor() {
    glowX += (mouseX - glowX) * 0.07;
    glowY += (mouseY - glowY) * 0.07;
    cursorGlow.style.left = glowX + 'px';
    cursorGlow.style.top = glowY + 'px';
    requestAnimationFrame(animateCursor);
}
animateCursor();

// Card 3D Tilt Effect
document.querySelectorAll('.login-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 25;
        const rotateY = (centerX - x) / 25;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-15px)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
});

// Ripple effect on card click
document.querySelectorAll('.login-card').forEach(card => {
    card.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(var(--primary-rgb), 0.15);
            width: 0; height: 0;
            left: ${e.clientX - rect.left}px;
            top: ${e.clientY - rect.top}px;
            transform: translate(-50%, -50%);
            pointer-events: none;
            animation: rippleExpand 0.6s ease-out forwards;
            z-index: 100;
        `;
        this.appendChild(ripple);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes rippleExpand {
                0% { width: 0; height: 0; opacity: 1; }
                100% { width: 500px; height: 500px; opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => ripple.remove(), 700);
    });
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
