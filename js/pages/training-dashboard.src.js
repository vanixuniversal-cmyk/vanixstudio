// API base set by js/api-config.js
const API = window.API_BASE || '';
let token = null;
let currentStudentId = '';
let classesList = [];
let completedClasses = [];
let currentClassId = null;

// Boot check
window.addEventListener('load', async () => {
    token = sessionStorage.getItem('student_token');
    currentStudentId = sessionStorage.getItem('student_id');

    if (!token) {
        window.location.href = 'training-login.html';
        return;
    }

    document.getElementById('studentIdDisplay').textContent = currentStudentId;
    
    // Load local storage completion list
    const stored = localStorage.getItem(`vanix_completed_classes_${currentStudentId}`);
    if (stored) {
        try {
            completedClasses = JSON.parse(stored);
        } catch (e) {
            completedClasses = [];
        }
    }

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
        updateProgress();
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
        
        const isCompleted = completedClasses.includes(cls.id);
        
        item.innerHTML = `
            <div class="class-number">${idx + 1}</div>
            <div class="class-info">
                <div class="class-title" title="${escapeHtml(cls.title)}">${escapeHtml(cls.title)}</div>
                <div class="class-duration">Class Recording</div>
            </div>
            <div class="completion-check-btn ${isCompleted ? 'completed' : ''}" 
                 title="Mark as completed"
                 onclick="toggleCompletion(event, ${cls.id})">✓</div>
        `;
        
        // Listen to select click on anywhere other than checkmark
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('completion-check-btn')) return;
            selectClass(cls, item);
        });
        
        listEl.appendChild(item);
    });
}

// Select and Play a class
function selectClass(cls, itemEl) {
    currentClassId = cls.id;
    
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
    
    // Load student memo scratchpad
    const savedMemo = localStorage.getItem(`vanix_memo_${currentStudentId}_${cls.id}`) || '';
    document.getElementById('memoScratchpad').value = savedMemo;
    document.getElementById('memoStatus').textContent = savedMemo ? 'Saved draft loaded' : 'Write notes...';
    
    // Return to default notes tab
    switchTab('notes');
}

// Toggle class completion status
function toggleCompletion(e, classId) {
    e.stopPropagation();
    
    const index = completedClasses.indexOf(classId);
    if (index > -1) {
        completedClasses.splice(index, 1);
    } else {
        completedClasses.push(classId);
    }
    
    // Save to local storage
    localStorage.setItem(`vanix_completed_classes_${currentStudentId}`, JSON.stringify(completedClasses));
    
    // Update interface
    renderClasses();
    updateProgress();
}

// Update Curriculum Progress statistics
function updateProgress() {
    if (classesList.length === 0) return;
    
    // Find intersection of current classes with completed list to handle deleted classes
    const validCompletions = completedClasses.filter(id => classesList.some(c => c.id === id));
    const percentage = Math.round((validCompletions.length / classesList.length) * 100);
    
    document.getElementById('progressPct').textContent = `${percentage}%`;
    document.getElementById('progressBarFill').style.width = `${percentage}%`;
}

// Save Memo Scratchpad locally
function saveMemo() {
    if (!currentClassId) return;
    const memoText = document.getElementById('memoScratchpad').value;
    localStorage.setItem(`vanix_memo_${currentStudentId}_${currentClassId}`, memoText);
    document.getElementById('memoStatus').textContent = 'Draft autosaved locally';
}

// Switch tabs on details card
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    if (tabName === 'notes') {
        document.getElementById('tabBtnNotes').classList.add('active');
        document.getElementById('tabNotes').classList.add('active');
    } else if (tabName === 'resources') {
        document.getElementById('tabBtnResources').classList.add('active');
        document.getElementById('tabResources').classList.add('active');
    } else if (tabName === 'memo') {
        document.getElementById('tabBtnMemo').classList.add('active');
        document.getElementById('tabMemo').classList.add('active');
    }
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

// Window bindings
window.logoutStudent = logoutStudent;
window.toggleCompletion = toggleCompletion;
window.saveMemo = saveMemo;
window.switchTab = switchTab;
