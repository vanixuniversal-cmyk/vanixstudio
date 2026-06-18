// API base set by js/api-config.js
const API = window.API_BASE || '';
let token = null;
let currentStudentId = '';
let classesList = [];

// Boot check
window.addEventListener('load', async () => {
    token = sessionStorage.getItem('student_token');
    currentStudentId = sessionStorage.getItem('student_id');

    if (!token) {
        window.location.href = 'training-login.html';
        return;
    }

    document.getElementById('studentIdDisplay').textContent = currentStudentId;
    await fetchClasses();
});

// Fetch Curriculum Classes
async function fetchClasses() {
    try {
        const response = await fetch(`${API}/api/training/classes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logoutStudent();
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load training classes');
        }

        classesList = await response.json();
        renderClasses();
    } catch (err) {
        console.error(err);
        document.getElementById('classesList').innerHTML = 
            `<div style="text-align:center; padding: 40px; color: #ff6464; font-size:12px;">Error: ${err.message}</div>`;
    }
}

// Render Classes List
function renderClasses() {
    const listEl = document.getElementById('classesList');
    if (classesList.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-dim); font-size:12px;">No recorded classes posted yet.</div>`;
        return;
    }

    listEl.innerHTML = '';
    classesList.forEach((cls, idx) => {
        const item = document.createElement('div');
        item.className = 'class-item';
        item.setAttribute('data-id', cls.id);
        item.innerHTML = `
            <div class="class-number">${idx + 1}</div>
            <div class="class-info">
                <div class="class-title" title="${escapeHtml(cls.title)}">${escapeHtml(cls.title)}</div>
                <div class="class-duration">Class Recording</div>
            </div>
        `;
        item.addEventListener('click', () => selectClass(cls, item));
        listEl.appendChild(item);
    });
}

// Select and Play a class
function selectClass(cls, itemEl) {
    // Highlight selected item
    document.querySelectorAll('.class-item').forEach(el => el.classList.remove('active'));
    itemEl.classList.add('active');

    // Hide placeholder, show player
    document.getElementById('videoPlaceholder').style.display = 'none';
    const container = document.getElementById('videoContainer');
    container.style.display = 'block';

    // Set video source
    const url = cls.video_url;
    const isDirectVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg');
    
    if (isDirectVideo) {
        container.innerHTML = `<video src="${url}" controls autoplay style="width:100%; height:100%; object-fit:contain;"></video>`;
    } else {
        const embedUrl = getEmbedUrl(url);
        container.innerHTML = `<iframe src="${embedUrl}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="width:100%; height:100%; border:none;"></iframe>`;
    }

    // Set metadata
    document.getElementById('currentVideoTitle').textContent = cls.title;
    document.getElementById('currentVideoDesc').textContent = cls.description || 'No description provided for this class recording.';
}

// Convert video links to embed format
function getEmbedUrl(url) {
    if (url.includes('youtube.com/watch?v=')) {
        const id = url.split('v=')[1].split('&')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
    } else if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
    } else if (url.includes('vimeo.com/')) {
        const parts = url.split('vimeo.com/');
        const id = parts[parts.length - 1].split('?')[0];
        return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }
    return url;
}

// Logout
function logoutStudent() {
    sessionStorage.removeItem('student_token');
    sessionStorage.removeItem('student_id');
    window.location.href = 'training-login.html';
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
