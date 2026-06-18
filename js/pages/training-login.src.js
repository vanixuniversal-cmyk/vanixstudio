// API base set by js/api-config.js
const API = window.API_BASE || '';

document.getElementById('studentLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const studentIdInput = document.getElementById('studentIdInput');
    const passwordInput = document.getElementById('passwordInput');
    const submitBtn = document.getElementById('submitBtn');
    const idError = document.getElementById('idError');
    const passError = document.getElementById('passError');

    // Reset errors
    idError.classList.remove('show');
    passError.classList.remove('show');

    let hasError = false;
    if (!studentIdInput.value.trim()) {
        idError.classList.add('show');
        hasError = true;
    }
    if (!passwordInput.value) {
        passError.classList.add('show');
        hasError = true;
    }

    if (hasError) return;

    // Show loading spinner
    submitBtn.classList.add('loading');

    try {
        const response = await fetch(`${API}/api/auth/training-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_id: studentIdInput.value.trim(),
                password: passwordInput.value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Authentication failed');
        }

        // Store student session details
        sessionStorage.setItem('student_token', data.access_token);
        sessionStorage.setItem('student_id', data.student_id);

        // Show success overlay
        document.getElementById('authSuccess').classList.add('visible');

        // Redirect after a small delay
        setTimeout(() => {
            window.location.href = 'training-dashboard.html';
        }, 1200);

    } catch (err) {
        alert(err.message);
    } finally {
        submitBtn.classList.remove('loading');
    }
});
