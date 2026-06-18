// ════════ INITIAL LOADER ════════
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 2000);
});

// ════════ MOUSE PROXIMITY CURSOR GLOW ════════
const cursorGlow = document.getElementById('cursorGlow');
let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});
(function animateCursor() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    if (cursorGlow) {
        cursorGlow.style.left = glowX + 'px';
        cursorGlow.style.top = glowY + 'px';
    }
    requestAnimationFrame(animateCursor);
})();

// ════════ ACTIVE CREATORS INCREMENTER SIMULATION ════════
const activeCreatorsCount = document.getElementById('activeCreatorsCount');
if (activeCreatorsCount) {
    let count = parseInt(activeCreatorsCount.textContent.replace(/,/g, ''), 10) || 1248;
    setInterval(() => {
        const increment = Math.floor(Math.random() * 2) + 1;
        count += increment;
        activeCreatorsCount.textContent = count.toLocaleString();
    }, 5000);
}

// ════════ PASSWORDS VISIBILITY TOGGLES ════════
function setupPasswordToggle(inputFieldId, toggleBtnId) {
    const input = document.getElementById(inputFieldId);
    const btn = document.getElementById(toggleBtnId);
    let visible = false;
    btn.addEventListener('click', () => {
        visible = !visible;
        input.type = visible ? 'text' : 'password';
        btn.textContent = visible ? '🙈' : '👁';
    });
}
setupPasswordToggle('passwordInput', 'togglePassword');
setupPasswordToggle('confirmPasswordInput', 'toggleConfirmPassword');

// ════════ CUSTOM SELECT MULTI-CHIPS (CINEMATIC INTERESTS) ════════
const interestItems = document.querySelectorAll('.interest-item');
const selectedInterests = new Set();

interestItems.forEach(item => {
    item.addEventListener('click', () => {
        const val = item.getAttribute('data-value');
        if (selectedInterests.has(val)) {
            selectedInterests.delete(val);
            item.classList.remove('selected');
        } else {
            selectedInterests.add(val);
            item.classList.add('selected');
        }
        validateInterests();
    });
});

function validateInterests() {
    const errorMsg = document.getElementById('userInterestsError');
    if (selectedInterests.size > 0) {
        errorMsg.classList.remove('show');
        return true;
    } else {
        errorMsg.classList.add('show');
        return false;
    }
}

// ════════ CUSTOM SECURITY CHECKBOX AGREEMENT ════════
const termsCheckbox = document.getElementById('termsCheckbox');
const termsWrapper = document.getElementById('termsWrapper');
const termsError = document.getElementById('termsError');
let termsAgreed = false;

function toggleTerms() {
    termsAgreed = !termsAgreed;
    termsCheckbox.classList.toggle('checked', termsAgreed);
    if (termsAgreed) {
        termsError.classList.remove('show');
    }
}
termsCheckbox.addEventListener('click', toggleTerms);
termsWrapper.addEventListener('click', (e) => {
    if (e.target !== termsCheckbox) {
        toggleTerms();
    }
});

// ════════ GENERIC FIELD STATE SETTER ════════
function setFieldStatus(wrapper, indicator, errorEl, status) {
    if (status === 'valid') {
        wrapper.classList.add('valid');
        wrapper.classList.remove('invalid');
        indicator.className = 'input-indicator valid';
        if (errorEl) errorEl.classList.remove('show');
    } else if (status === 'invalid') {
        wrapper.classList.add('invalid');
        wrapper.classList.remove('valid');
        indicator.className = 'input-indicator invalid';
    } else {
        wrapper.classList.remove('valid', 'invalid');
        indicator.className = 'input-indicator';
        if (errorEl) errorEl.classList.remove('show');
    }
}

// ════════ REAL-TIME VALIDATION RULES ════════
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 1. User Name Validator
const userNameInput = document.getElementById('userNameInput');
if (userNameInput) {
    userNameInput.addEventListener('input', () => {
        const val = userNameInput.value.trim();
        const wrapper = userNameInput.closest('.input-wrapper');
        const indicator = document.getElementById('userNameIndicator');
        const errorEl = document.getElementById('userNameError');

        if (val.length === 0) {
            setFieldStatus(wrapper, indicator, errorEl, 'empty');
        } else if (val.length >= 3) {
            setFieldStatus(wrapper, indicator, errorEl, 'valid');
        } else {
            setFieldStatus(wrapper, indicator, errorEl, 'invalid');
        }
    });
    userNameInput.addEventListener('blur', () => {
        const val = userNameInput.value.trim();
        if (val.length > 0 && val.length < 3) {
            document.getElementById('userNameError').classList.add('show');
        }
    });
}

// 2. Phone Number Validator
const userPhoneInput = document.getElementById('userPhoneInput');
if (userPhoneInput) {
    userPhoneInput.addEventListener('input', () => {
        const val = userPhoneInput.value.trim();
        const wrapper = userPhoneInput.closest('.input-wrapper');
        const indicator = document.getElementById('userPhoneIndicator');
        const errorEl = document.getElementById('userPhoneError');

        if (val.length === 0) {
            setFieldStatus(wrapper, indicator, errorEl, 'empty');
        } else if (/^\+?[\d\s\-()]{7,20}$/.test(val)) {
            setFieldStatus(wrapper, indicator, errorEl, 'valid');
        } else {
            setFieldStatus(wrapper, indicator, errorEl, 'invalid');
        }
    });
    userPhoneInput.addEventListener('blur', () => {
        const val = userPhoneInput.value.trim();
        if (val.length > 0 && !/^\+?[\d\s\-()]{7,20}$/.test(val)) {
            document.getElementById('userPhoneError').classList.add('show');
        }
    });
}

// 3. User Email Validator
const userEmailInput = document.getElementById('userEmailInput');
if (userEmailInput) {
    userEmailInput.addEventListener('input', () => {
        const val = userEmailInput.value.trim();
        const wrapper = userEmailInput.closest('.input-wrapper');
        const indicator = document.getElementById('userEmailIndicator');
        const errorEl = document.getElementById('userEmailError');

        if (val.length === 0) {
            setFieldStatus(wrapper, indicator, errorEl, 'empty');
        } else if (validateEmail(val)) {
            setFieldStatus(wrapper, indicator, errorEl, 'valid');
        } else {
            setFieldStatus(wrapper, indicator, errorEl, 'invalid');
        }
    });
    userEmailInput.addEventListener('blur', () => {
        const val = userEmailInput.value.trim();
        if (val.length > 0 && !validateEmail(val)) {
            document.getElementById('userEmailError').classList.add('show');
        }
    });
}

// 4. Password Strength Validator
const passwordInput = document.getElementById('passwordInput');
if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        const wrapper = passwordInput.closest('.input-wrapper');
        const indicator = document.getElementById('passwordIndicator');
        const errorEl = document.getElementById('passwordError');

        if (val.length === 0) {
            setFieldStatus(wrapper, indicator, errorEl, 'empty');
        } else if (val.length >= 6) {
            setFieldStatus(wrapper, indicator, errorEl, 'valid');
        } else {
            setFieldStatus(wrapper, indicator, errorEl, 'invalid');
        }
        
        const confirmVal = confirmPasswordInput.value;
        if (confirmVal.length > 0) {
            validateConfirmPassword();
        }
    });
    passwordInput.addEventListener('blur', () => {
        if (passwordInput.value.length > 0 && passwordInput.value.length < 6) {
            document.getElementById('passwordError').classList.add('show');
        }
    });
}

// 5. Confirm Password Validator
const confirmPasswordInput = document.getElementById('confirmPasswordInput');
if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', validateConfirmPassword);
    confirmPasswordInput.addEventListener('blur', () => {
        const val = confirmPasswordInput.value;
        const match = val === passwordInput.value;
        if (val.length > 0 && !match) {
            document.getElementById('confirmPasswordError').classList.add('show');
        }
    });
}

function validateConfirmPassword() {
    const val = confirmPasswordInput.value;
    const matchVal = passwordInput.value;
    const wrapper = confirmPasswordInput.closest('.input-wrapper');
    const indicator = document.getElementById('confirmPasswordIndicator');
    const errorEl = document.getElementById('confirmPasswordError');

    if (val.length === 0) {
        setFieldStatus(wrapper, indicator, errorEl, 'empty');
        return false;
    } else if (val === matchVal && matchVal.length >= 6) {
        setFieldStatus(wrapper, indicator, errorEl, 'valid');
        return true;
    } else {
        setFieldStatus(wrapper, indicator, errorEl, 'invalid');
        return false;
    }
}

function validateTerms() {
    const errorEl = document.getElementById('termsError');
    if (termsAgreed) {
        if (errorEl) errorEl.classList.remove('show');
        return true;
    } else {
        if (errorEl) errorEl.classList.add('show');
        return false;
    }
}

// ════════ HYPER-PREMIUM AUTH CARD TILT EFFECT ════════
const authCard = document.getElementById('authCard');
if (authCard) {
    authCard.addEventListener('mousemove', (e) => {
        if (window.innerWidth <= 992) {
            authCard.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
            return;
        }
        const rect = authCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 45;
        const rotateY = (centerX - x) / 45;
        authCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    authCard.addEventListener('mouseleave', () => {
        authCard.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
}

// ════════ GOOGLE / GITHUB RIPPLE MICRO-ANIMATION ════════
function setupRipple(btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position:absolute;border-radius:50%;background:rgba(255,255,255,0.08);
            width:0;height:0;left:${e.clientX - rect.left}px;top:${e.clientY - rect.top}px;
            transform:translate(-50%,-50%);pointer-events:none;
            animation:rippleAnim 0.6s ease-out forwards;z-index:10;
        `;
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        if (!document.getElementById('rippleStyle')) {
            const style = document.createElement('style');
            style.id = 'rippleStyle';
            style.textContent = `@keyframes rippleAnim{0%{width:0;height:0;opacity:1}100%{width:400px;height:400px;opacity:0}}`;
            document.head.appendChild(style);
        }
        
        setTimeout(() => ripple.remove(), 700);
    });
}
setupRipple('googleBtn');
setupRipple('githubBtn');

// ════════ REGISTRATION SUBMISSION & PERSISTENCE ENGINE ════════
const registerForm = document.getElementById('registerForm');
const submitBtn = document.getElementById('submitBtn');
const btnSpinnerText = document.getElementById('btnSpinnerText');
const authSuccess = document.getElementById('authSuccess');
const successTitle = document.getElementById('successTitle');
const successSubtitle = document.getElementById('successSubtitle');

const API = window.API_BASE || '';

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let valid = true;
        
        const name = userNameInput.value.trim();
        const email = userEmailInput.value.trim();
        const phone = userPhoneInput.value.trim();
        const password = passwordInput.value;
        
        if (name.length < 3) {
            document.getElementById('userNameError').classList.add('show');
            userNameInput.closest('.input-wrapper').classList.add('invalid');
            valid = false;
        }
        if (!/^\+?[\d\s\-()]{7,20}$/.test(phone)) {
            document.getElementById('userPhoneError').classList.add('show');
            userPhoneInput.closest('.input-wrapper').classList.add('invalid');
            valid = false;
        }
        if (!validateEmail(email)) {
            document.getElementById('userEmailError').classList.add('show');
            userEmailInput.closest('.input-wrapper').classList.add('invalid');
            valid = false;
        }
        if (password.length < 6) {
            document.getElementById('passwordError').classList.add('show');
            passwordInput.closest('.input-wrapper').classList.add('invalid');
            valid = false;
        }
        if (!validateConfirmPassword()) {
            document.getElementById('confirmPasswordError').classList.add('show');
            confirmPasswordInput.closest('.input-wrapper').classList.add('invalid');
            valid = false;
        }
        if (!validateInterests()) {
            valid = false;
        }
        if (!validateTerms()) {
            valid = false;
        }

        if (!valid) {
            authCard.style.animation = 'none';
            setTimeout(() => {
                authCard.style.animation = 'shakeCard 0.4s ease';
            }, 10);
            return;
        }

        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        const spinStates = [
            "ENCRYPTING SECURITY SHIELD...",
            "COMPILING USER NODE...",
            "SYNCHRONIZING DELTAS...",
            "DEPLOYING PIPELINE..."
        ];
        
        let stateIdx = 0;
        const spinInterval = setInterval(() => {
            if (stateIdx < spinStates.length) {
                btnSpinnerText.textContent = spinStates[stateIdx++];
            }
        }, 450);

        try {
            const interestsList = Array.from(selectedInterests).join(',');
            const response = await fetch(`${API}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    phone,
                    interests: interestsList
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Registration failed');
            }

            clearInterval(spinInterval);
            submitBtn.classList.remove('loading');

            successTitle.innerHTML = "USER PIPELINE <span style='color:var(--primary);'>ACTIVE</span>";
            successSubtitle.textContent = "Welcome, client. Initializing login page...";
            authSuccess.classList.add('show');

            setTimeout(() => {
                window.location.href = 'pages/user-login.html';
            }, 2200);

        } catch (err) {
            clearInterval(spinInterval);
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            btnSpinnerText.textContent = "INITIALIZE REGISTRATION";
            alert('⚠ Error: ' + err.message);
        }
    });
}

if (!document.getElementById('cardShakeStyle')) {
    const shakeStyle = document.createElement('style');
    shakeStyle.id = 'cardShakeStyle';
    shakeStyle.textContent = `
        @keyframes shakeCard {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
        }
    `;
    document.head.appendChild(shakeStyle);
}

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
