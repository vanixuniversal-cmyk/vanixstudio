// ════════ ACTIVE SESSION DETECTION & REDIRECT ════════
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
                    window.location.href = '../index.html';
                } else if (activeSession.role === 'employee') {
                    sessionStorage.setItem('emp_token', activeSession.token);
                    sessionStorage.setItem('emp_name', activeSession.name || '');
                    sessionStorage.setItem('emp_email', activeSession.email || '');
                    window.location.href = '../index.html';
                } else if (activeSession.role === 'super_admin') {
                    sessionStorage.setItem('sa_token', activeSession.token);
                    sessionStorage.setItem('sa_email', activeSession.email || '');
                    window.location.href = '../index.html';
                }
            }
        } catch (e) {
            console.error('Active session check failed', e);
        }
    }
})();

// ════════ LOADER ════════
window.addEventListener('load', () => {
    setTimeout(() => { document.getElementById('loader').classList.add('hidden'); }, 2000);
});

// ════════ CURSOR GLOW ════════
const cursorGlow = document.getElementById('cursorGlow');
let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
(function animateCursor() {
    glowX += (mouseX - glowX) * 0.07;
    glowY += (mouseY - glowY) * 0.07;
    cursorGlow.style.left = glowX + 'px';
    cursorGlow.style.top = glowY + 'px';
    requestAnimationFrame(animateCursor);
})();

// ════════ CUSTOM CHECKBOX ════════
const rememberCheckbox = document.getElementById('rememberCheckbox');
rememberCheckbox.addEventListener('click', () => {
    rememberCheckbox.classList.toggle('checked');
});
document.getElementById('rememberWrapper').addEventListener('click', () => {
    rememberCheckbox.classList.toggle('checked');
});

// ════════ PASSWORD TOGGLE ════════
const passwordInput = document.getElementById('passwordInput');
const togglePassword = document.getElementById('togglePassword');
let passwordVisible = false;
togglePassword.addEventListener('click', () => {
    passwordVisible = !passwordVisible;
    passwordInput.type = passwordVisible ? 'text' : 'password';
    togglePassword.textContent = passwordVisible ? '🙈' : '👁';
});

// ════════ REAL-TIME VALIDATION ════════
const emailInput = document.getElementById('emailInput');
const emailIndicator = document.getElementById('emailIndicator');
const emailError = document.getElementById('emailError');
const passwordIndicator = document.getElementById('passwordIndicator');
const passwordError = document.getElementById('passwordError');

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

emailInput.addEventListener('input', () => {
    const val = emailInput.value.trim();
    if (val.length === 0) {
        emailIndicator.className = 'input-indicator';
        emailError.classList.remove('show');
    } else if (validateEmail(val)) {
        emailIndicator.className = 'input-indicator valid';
        emailError.classList.remove('show');
    } else {
        emailIndicator.className = 'input-indicator invalid';
    }
});

emailInput.addEventListener('blur', () => {
    if (emailInput.value.trim() && !validateEmail(emailInput.value.trim())) {
        emailError.classList.add('show');
    }
});

passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    if (val.length === 0) {
        passwordIndicator.className = 'input-indicator';
        passwordError.classList.remove('show');
    } else if (val.length >= 6) {
        passwordIndicator.className = 'input-indicator valid';
        passwordError.classList.remove('show');
    } else {
        passwordIndicator.className = 'input-indicator invalid';
    }
});

passwordInput.addEventListener('blur', () => {
    if (passwordInput.value && passwordInput.value.length < 6) {
        passwordError.classList.add('show');
    }
});

// ════════ FORM SUBMIT ════════
const loginForm = document.getElementById('loginForm');
const submitBtn = document.getElementById('submitBtn');
const authSuccess = document.getElementById('authSuccess');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let valid = true;

    // Reset error text
    passwordError.querySelector('span').textContent = '⚠ Password must be at least 6 characters';

    if (!validateEmail(email)) {
        emailError.classList.add('show');
        emailIndicator.className = 'input-indicator invalid';
        valid = false;
    }
    if (password.length < 6) {
        passwordError.classList.add('show');
        passwordIndicator.className = 'input-indicator invalid';
        valid = false;
    }

    // Loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'user' })
    })
    .then(async (resp) => {
        if (!resp.ok) {
            let errorMsg = 'Invalid credentials';
            try {
                const errorData = await resp.json();
                errorMsg = errorData.detail || errorMsg;
            } catch (e) {}
            throw new Error(errorMsg);
        }
        return resp.json();
    })
    .then((data) => {
        submitBtn.classList.remove('loading');
        
        authSuccess.querySelector('.success-text').innerHTML = `WELCOME BACK, <span style="color:var(--primary);">${data.name.toUpperCase()}</span>`;
        sessionStorage.setItem('user_name', data.name);
        sessionStorage.setItem('user_token', data.access_token);
        sessionStorage.setItem('user_email', data.email);
        if (data.log_id) sessionStorage.setItem('user_log_id', data.log_id);

        localStorage.setItem('vanix_active_session', JSON.stringify({
            role: 'user',
            token: data.access_token,
            name: data.name,
            email: data.email
        }));

        authSuccess.classList.add('show');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1800);
    })
    .catch((err) => {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        
        passwordError.querySelector('span').textContent = '⚠ ' + err.message;
        passwordError.classList.add('show');
        passwordIndicator.className = 'input-indicator invalid';
    });
});

// ════════ GOOGLE FIREBASE SSO EXPERIENCE ════════

const API = window.API_BASE || '';

// Load Firebase dynamically
(function loadFirebaseSDK() {
    if (window.firebase) return;
    
    const appScript = document.createElement('script');
    appScript.src = "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js";
    document.head.appendChild(appScript);
    
    appScript.onload = () => {
        const authScript = document.createElement('script');
        authScript.src = "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js";
        document.head.appendChild(authScript);
        
        authScript.onload = async () => {
            try {
                // Fetch config dynamically from backend env variables
                const res = await fetch(`${API}/api/auth/firebase-config`);
                const firebaseConfig = await res.json();
                
                firebase.initializeApp(firebaseConfig);
                console.log("🔥 Firebase Auth SDK initialized dynamically from backend.");
            } catch (e) {
                console.warn("Failed to fetch Firebase config from backend, using placeholder fallbacks:", e);
                const firebaseConfig = {
                    apiKey: "AIzaSyAs-DEMO-API-KEY-FOR-VANIX-STUDIO",
                    authDomain: "vanix-studio.firebaseapp.com",
                    projectId: "vanix-studio",
                    storageBucket: "vanix-studio.appspot.com",
                    appId: "1:1234567890:web:abcdef123456"
                };
                firebase.initializeApp(firebaseConfig);
            }
        };
    };
})();

// Google Sign-In Event Trigger
document.getElementById('googleBtn').addEventListener('click', () => {
    if (window.firebase && firebase.auth) {
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Disable button and show loading state
        const googleBtn = document.getElementById('googleBtn');
        const originalHTML = googleBtn.innerHTML;
        googleBtn.disabled = true;
        googleBtn.innerHTML = 'Connecting to Firebase...';
        firebase.auth().signInWithPopup(provider)
            .then(async (result) => {
                const user = result.user;
                console.log("Firebase Authentication successful:", user);
                
                try {
                    const backRes = await fetch(`${API}/api/auth/firebase-login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: user.email,
                            name: user.displayName || 'Google User',
                            token: user.accessToken || 'firebase_token_abc'
                        })
                    });
                    
                    if (!backRes.ok) throw new Error("Backend authentication failed");
                    
                    const dbData = await backRes.json();
                    
                    // Set credentials to sessionStorage for global tracking
                    sessionStorage.setItem('user_token', dbData.access_token);
                    sessionStorage.setItem('user_name', dbData.name);
                    sessionStorage.setItem('user_email', dbData.email);
                    localStorage.setItem('vanix_active_session', JSON.stringify({
                        role: 'user',
                        token: dbData.access_token,
                        name: dbData.name,
                        email: dbData.email
                    }));
                    if (dbData.log_id) sessionStorage.setItem('user_log_id', dbData.log_id);
                } catch (err) {
                    console.warn("Backend Firebase registration failed, using local session:", err);
                    sessionStorage.setItem('user_token', user.accessToken || 'firebase_token_abc');
                    sessionStorage.setItem('user_name', user.displayName || 'Client');
                    sessionStorage.setItem('user_email', user.email);
                    localStorage.setItem('vanix_active_session', JSON.stringify({
                        role: 'user',
                        token: user.accessToken || 'firebase_token_abc',
                        name: user.displayName || 'Client',
                        email: user.email
                    }));
                }
                
                const authSuccess = document.getElementById('authSuccess');
                authSuccess.querySelector('.success-text').innerHTML = `WELCOME BACK, <span style="color:var(--primary);">${(user.displayName || 'Client').toUpperCase()}</span>`;
                authSuccess.classList.add('show');
                
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 1800);
            })
            .catch((err) => {
                console.error("Firebase Authentication failed:", err);
                alert("Firebase Google Sign-In Error: " + err.message);
                googleBtn.disabled = false;
                googleBtn.innerHTML = originalHTML;
            });
    } else {
        alert("Firebase is still initializing or offline. Please wait a moment and try again.");
    }
});

// ════════ CARD TILT ════════
const authCard = document.getElementById('authCard');
authCard.addEventListener('mousemove', (e) => {
    const rect = authCard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 40;
    const rotateY = (centerX - x) / 40;
    authCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});
authCard.addEventListener('mouseleave', () => {
    authCard.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
});
