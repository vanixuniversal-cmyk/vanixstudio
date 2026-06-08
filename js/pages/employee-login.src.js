/* ═════════════════════════════════════════
   ACTIVE SESSION DETECTION & REDIRECT
═════════════════════════════════════════ */
(function checkAndRedirectActiveSession() {
    const activeSessionStr = localStorage.getItem('vanix_active_session');
    if (activeSessionStr) {
        try {
            const activeSession = JSON.parse(activeSessionStr);
            if (activeSession && activeSession.token) {
                if (activeSession.role === 'employee') {
                    sessionStorage.setItem('emp_token', activeSession.token);
                    sessionStorage.setItem('emp_name', activeSession.name || '');
                    sessionStorage.setItem('emp_email', activeSession.email || '');
                    window.location.href = '../index.html';
                } else if (activeSession.role === 'super_admin') {
                    sessionStorage.setItem('sa_token', activeSession.token);
                    sessionStorage.setItem('sa_email', activeSession.email || '');
                    const urlParams = new URLSearchParams(window.location.search);
                    const targetSec = urlParams.get('redirect') === 'developer' ? '?section=developer' : '';
                    window.location.href = 'super-admin.html' + targetSec;
                } else if (activeSession.role === 'user') {
                    sessionStorage.setItem('user_token', activeSession.token);
                    sessionStorage.setItem('user_name', activeSession.name || '');
                    sessionStorage.setItem('user_email', activeSession.email || '');
                    window.location.href = '../index.html';
                }
            }
        } catch (e) {
            console.error('Active session check failed', e);
        }
    }
})();

/* ═════════════════════════════════════════
   LOADER WITH COUNTER
═════════════════════════════════════════ */
let loaderPercent = 0;
const loaderFill = document.getElementById('loaderFill');
const loaderPercentEl = document.getElementById('loaderPercent');
const loaderInterval = setInterval(() => {
    loaderPercent += Math.random() * 18;
    if (loaderPercent >= 100) { loaderPercent = 100; clearInterval(loaderInterval); }
    loaderFill.style.width = loaderPercent + '%';
    loaderPercentEl.textContent = Math.floor(loaderPercent) + '%';
}, 120);
window.addEventListener('load', () => {
    setTimeout(() => { document.getElementById('loader').classList.add('hidden'); }, 2200);
});

/* ═════════════════════════════════════════
   CURSOR
═════════════════════════════════════════ */
const cursorDot = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');
const cursorGlow = document.getElementById('cursorGlow');
let mx = 0, my = 0, rx = 0, ry = 0, gx = 0, gy = 0;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
document.querySelectorAll('a, button, input, .checkbox-group').forEach(el => {
    el.addEventListener('mouseenter', () => cursorRing.classList.add('expanded'));
    el.addEventListener('mouseleave', () => cursorRing.classList.remove('expanded'));
});

(function animateCursors() {
    cursorDot.style.left = mx + 'px'; cursorDot.style.top = my + 'px';
    rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
    cursorRing.style.left = rx + 'px'; cursorRing.style.top = ry + 'px';
    gx += (mx - gx) * 0.06; gy += (my - gy) * 0.06;
    cursorGlow.style.left = gx + 'px'; cursorGlow.style.top = gy + 'px';
    requestAnimationFrame(animateCursors);
})();

/* ═════════════════════════════════════════
   PARTICLES CANVAS
═════════════════════════════════════════ */
const canvas = document.getElementById('particlesCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + 10;
        this.size = Math.random() * 2.5 + 0.5;
        this.speed = Math.random() * 0.8 + 0.3;
        this.opacity = Math.random() * 0.6 + 0.1;
        this.drift = (Math.random() - 0.5) * 0.4;
    }
    update() {
        this.y -= this.speed; this.x += this.drift;
        if (this.y < -10) this.reset();
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = 'var(--primary)';
        ctx.shadowColor = 'var(--primary)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

for (let i = 0; i < 35; i++) {
    const p = new Particle();
    p.y = Math.random() * canvas.height;
    particles.push(p);
}

(function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animateParticles);
})();

/* ═════════════════════════════════════════
   PASSWORD TOGGLE
═════════════════════════════════════════ */
const passwordInput = document.getElementById('passwordInput');
const eyeToggle = document.getElementById('eyeToggle');
let passVisible = false;
eyeToggle.addEventListener('click', () => {
    passVisible = !passVisible;
    passwordInput.type = passVisible ? 'text' : 'password';
    eyeToggle.textContent = passVisible ? '🙈' : '👁';
});

/* ═════════════════════════════════════════
   REAL-TIME VALIDATION
═════════════════════════════════════════ */
const emailInput = document.getElementById('emailInput');
const emailStatus = document.getElementById('emailStatus');
const emailError = document.getElementById('emailError');
const passStatus = document.getElementById('passStatus');
const passError = document.getElementById('passError');

function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

emailInput.addEventListener('input', () => {
    const v = emailInput.value.trim();
    if (!v) { emailInput.className = 'form-input'; emailStatus.className = 'input-status'; emailError.classList.remove('show'); return; }
    if (isValidEmail(v)) {
        emailInput.className = 'form-input valid';
        emailStatus.className = 'input-status valid';
        emailError.classList.remove('show');
    } else {
        emailInput.className = 'form-input invalid';
        emailStatus.className = 'input-status invalid';
    }
});
emailInput.addEventListener('blur', () => {
    if (emailInput.value && !isValidEmail(emailInput.value)) emailError.classList.add('show');
});

passwordInput.addEventListener('input', () => {
    const v = passwordInput.value;
    if (!v) { passwordInput.className = 'form-input'; passStatus.className = 'input-status'; passError.classList.remove('show'); return; }
    if (v.length >= 6) {
        passwordInput.className = 'form-input valid';
        passStatus.className = 'input-status valid';
        passError.classList.remove('show');
    } else {
        passwordInput.className = 'form-input invalid';
        passStatus.className = 'input-status invalid';
    }
});
passwordInput.addEventListener('blur', () => {
    if (passwordInput.value && passwordInput.value.length < 6) passError.classList.add('show');
});

/* ═════════════════════════════════════════
   CUSTOM CHECKBOX
═════════════════════════════════════════ */
const rememberBox = document.getElementById('rememberBox');
document.getElementById('rememberGroup').addEventListener('click', () => {
    rememberBox.classList.toggle('active');
});

/* ═════════════════════════════════════════
   FORM SUBMIT
═════════════════════════════════════════ */
const loginForm = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');
const authSuccess = document.getElementById('authSuccess');

const API = window.API_BASE || '';

loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const pass = passwordInput.value;
    let valid = true;

    passError.querySelector('span').textContent = '⚠ Password must be at least 6 characters';

    if (!isValidEmail(email)) {
        emailError.classList.add('show');
        emailInput.className = 'form-input invalid';
        emailStatus.className = 'input-status invalid';
        valid = false;
    }
    if (pass.length < 6) {
        passError.classList.add('show');
        passwordInput.className = 'form-input invalid';
        passStatus.className = 'input-status invalid';
        valid = false;
    }
    if (!valid) return;

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;

    try {
        const resp = await fetch(`${API}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass, role: 'employee' })
        });
        let data = {};
        if (resp.ok) {
            data = await resp.json();
        } else {
            let errorMsg = 'Invalid credentials';
            try {
                data = await resp.json();
                errorMsg = data.detail || errorMsg;
            } catch (e) {
                errorMsg = `Server error (${resp.status}): ${resp.statusText || 'Internal Server Error'}`;
            }
            throw new Error(errorMsg);
        }

        sessionStorage.setItem('emp_token', data.access_token);
        sessionStorage.setItem('emp_name', data.name);
        sessionStorage.setItem('emp_email', data.email);
        localStorage.setItem('vanix_active_session', JSON.stringify({
            role: 'employee',
            token: data.access_token,
            name: data.name,
            email: data.email
        }));

        const successTitle = authSuccess.querySelector('.success-title');
        successTitle.textContent = 'WELCOME, ';
        const nameSpan = document.createElement('span');
        nameSpan.style.color = 'var(--primary)';
        nameSpan.textContent = data.name.toUpperCase();
        successTitle.appendChild(nameSpan);
        authSuccess.querySelector('.success-sub').textContent = 'Loading your employee portal...';
        authSuccess.classList.add('visible');
        setTimeout(() => { window.location.href = '../index.html'; }, 2500);
    } catch (err) {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
        passError.querySelector('span').textContent = '⚠ ' + err.message;
        passError.classList.add('show');
        passwordInput.className = 'form-input invalid';
        passStatus.className = 'input-status invalid';
    }
});

/* ═════════════════════════════════════════
   CARD 3D TILT
═════════════════════════════════════════ */
const authCard = document.getElementById('authCard');
authCard.addEventListener('mousemove', e => {
    const r = authCard.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const cx = r.width / 2, cy = r.height / 2;
    const rX = (y - cy) / 45, rY = (cx - x) / 45;
    authCard.style.transform = `perspective(1200px) rotateX(${rX}deg) rotateY(${rY}deg)`;
});
authCard.addEventListener('mouseleave', () => {
    authCard.style.transform = 'perspective(1200px) rotateX(0) rotateY(0)';
});

/* ═════════════════════════════════════════
   RIPPLE EFFECT
═════════════════════════════════════════ */
function addRipple(el, e, color = 'rgba(255,255,255,0.07)') {
    const r = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.style.cssText = `
        position:absolute;border-radius:50%;background:${color};
        width:0;height:0;left:${e.clientX-r.left}px;top:${e.clientY-r.top}px;
        transform:translate(-50%,-50%);pointer-events:none;
        animation:rippleOut 0.65s ease-out forwards;z-index:0;
    `;
    if (!document.getElementById('rippleStyle')) {
        const s = document.createElement('style');
        s.id = 'rippleStyle';
        s.textContent = '@keyframes rippleOut{0%{width:0;height:0;opacity:1}100%{width:400px;height:400px;opacity:0}}';
        document.head.appendChild(s);
    }
    el.style.position = 'relative'; el.style.overflow = 'hidden';
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
}

document.getElementById('googleBtn').addEventListener('click', function(e) { addRipple(this, e); });
document.getElementById('githubBtn').addEventListener('click', function(e) { addRipple(this, e); });
submitBtn.addEventListener('click', function(e) { addRipple(this, e, 'rgba(255,255,255,0.12)'); });

/* ═════════════════════════════════════════
   HUD CHART ANIMATION
═════════════════════════════════════════ */
const chartBars = document.querySelectorAll('.chart-bar');
setInterval(() => {
    chartBars.forEach((bar, i) => {
        const h = Math.floor(Math.random() * 70) + 30;
        bar.style.height = h + '%';
        bar.classList.toggle('active', h > 75);
    });
}, 2000);

/* ═════════════════════════════════════════
   KONAMI CODE → SUPER ADMIN SECRET ACCESS
   Sequence: ↑ ↑ ↓ ↓ ← → ← → B A
═════════════════════════════════════════ */
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIdx = 0;

// Inject Super Admin overlay HTML + CSS
(function injectSAOverlay() {
    const style = document.createElement('style');
    style.textContent = `
        #saOverlay {
            position:fixed;inset:0;z-index:99999;
            background:rgba(0,0,0,0.92);
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            opacity:0;visibility:hidden;
            transition:all 0.5s;
            backdrop-filter:blur(10px);
        }
        #saOverlay.active{opacity:1;visibility:visible;}
        .sa-pulse{
            font-size:64px;
            animation:saGlow 0.8s ease infinite alternate;
            margin-bottom:24px;
        }
        @keyframes saGlow{
            from{filter:drop-shadow(0 0 10px var(--primary));}
            to{filter:drop-shadow(0 0 30px var(--primary)) drop-shadow(0 0 60px var(--primary));}
        }
        .sa-title{
            font-family:'Orbitron',sans-serif;
            font-size:clamp(18px,3vw,28px);
            font-weight:900;letter-spacing:6px;
            color:#fff;margin-bottom:8px;text-align:center;
        }
        .sa-subtitle{
            font-size:12px;letter-spacing:3px;
            color:rgba(var(--primary-rgb), 0.7);margin-bottom:40px;text-align:center;
            font-family:'Orbitron',sans-serif;
        }
        .sa-access-btn{
            padding:16px 48px;
            background:linear-gradient(135deg,var(--primary),var(--primary-dark));
            border:none;border-radius:10px;
            color:#fff;font-family:'Orbitron',sans-serif;
            font-size:13px;font-weight:900;letter-spacing:3px;
            cursor:pointer;
            box-shadow:0 0 40px rgba(var(--primary-rgb), 0.5);
            transition:all 0.3s;
            margin-bottom:16px;
        }
        .sa-access-btn:hover{transform:scale(1.05);box-shadow:0 0 60px rgba(var(--primary-rgb), 0.8);}
        .sa-cancel{
            font-size:11px;letter-spacing:2px;
            color:rgba(255,255,255,0.3);
            cursor:pointer;font-family:'Orbitron',sans-serif;
            background:none;border:none;padding:8px;
            transition:color 0.2s;
        }
        .sa-cancel:hover{color:rgba(255,255,255,0.6);}
        .sa-code-display{
            font-family:monospace;font-size:11px;
            color:rgba(var(--primary-rgb), 0.4);margin-bottom:32px;
            letter-spacing:2px;
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'saOverlay';
    overlay.innerHTML = `
        <div class="sa-pulse">⚡</div>
        <div class="sa-title">SUPER ADMIN MODE</div>
        <div class="sa-subtitle">TOP SECRET — AUTHORIZED PERSONNEL ONLY</div>
        <div class="sa-code-display">CLEARANCE CODE: VNX-SA-∞</div>
        <button class="sa-access-btn" onclick="enterSuperAdmin()">⚡ ENTER SUPER ADMIN</button>
        <button class="sa-cancel" onclick="closeSAOverlay()">✕ CANCEL ACCESS</button>
    `;
    document.body.appendChild(overlay);
})();

document.addEventListener('keydown', e => {
    if (e.key === KONAMI[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) {
            konamiIdx = 0;
            document.getElementById('saOverlay').classList.add('active');
        }
    } else {
        konamiIdx = 0;
    }
});

function closeSAOverlay() {
    document.getElementById('saOverlay').classList.remove('active');
}

async function enterSuperAdmin() {
    const email = prompt('SUPER ADMIN EMAIL:');
    const pass = prompt('SUPER ADMIN PASSWORD:');
    if (!email || !pass) { closeSAOverlay(); return; }
    try {
        const resp = await fetch(`${API}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass, role: 'super_admin' })
        });
        let data = {};
        if (resp.ok) {
            data = await resp.json();
        } else {
            let errorMsg = 'Access denied';
            try {
                data = await resp.json();
                errorMsg = data.detail || errorMsg;
            } catch (e) {
                errorMsg = `Server error (${resp.status}): ${resp.statusText || 'Internal Server Error'}`;
            }
            throw new Error(errorMsg);
        }
        sessionStorage.setItem('sa_token', data.access_token);
        sessionStorage.setItem('sa_email', data.email);
        localStorage.setItem('vanix_active_session', JSON.stringify({
            role: 'super_admin',
            token: data.access_token,
            email: data.email,
            name: 'Super Admin'
        }));
        closeSAOverlay();
        const urlParams = new URLSearchParams(window.location.search);
        const targetSec = urlParams.get('redirect') === 'developer' ? '?section=developer' : '';
        window.location.href = 'super-admin.html' + targetSec;
    } catch (err) {
        alert('⚠ ' + err.message);
    }
}

// Double click handler on "EMPLOYEE LOGIN" text to open Super Admin overlay
const employeeLoginTitle = document.getElementById('employeeLoginTitle');
if (employeeLoginTitle) {
    let clicks = 0;
    let timer = null;
    employeeLoginTitle.addEventListener('dblclick', (e) => {
        e.preventDefault();
        const saOverlay = document.getElementById('saOverlay');
        if (saOverlay) saOverlay.classList.add('active');
    });
    employeeLoginTitle.addEventListener('click', () => {
        clicks++;
        if (clicks === 1) {
            timer = setTimeout(() => {
                clicks = 0;
            }, 500); // 500ms double click threshold
        } else if (clicks === 2) {
            clearTimeout(timer);
            clicks = 0;
            const saOverlay = document.getElementById('saOverlay');
            if (saOverlay) saOverlay.classList.add('active');
        }
    });
}

// Expose overlay control functions to the global window scope for inline onclick handlers
window.enterSuperAdmin = enterSuperAdmin;
window.closeSAOverlay = closeSAOverlay;
