// API base set by js/api-config.js
const API = window.API_BASE || '';
let token = null;
let currentStudentId = '';
let classesList = [];
let completedClasses = [];
let currentClassId = null;
let resumeTargetClass = null;

// Authenticated API Helper
async function api(path, opts = {}) {
    const resp = await fetch(`${API}${path}`, {
        headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json', 
            ...opts.headers 
        },
        ...opts
    });
    if (resp.status === 401) { logoutStudent(); return null; }
    if (!resp.ok) { 
        const e = await resp.json().catch(() => ({})); 
        throw new Error(e.detail || 'Request failed'); 
    }
    return resp.json();
}

// Boot check
window.addEventListener('load', async () => {
    token = sessionStorage.getItem('student_token');
    currentStudentId = sessionStorage.getItem('student_id');

    if (!token) {
        window.location.href = 'training-login.html';
        return;
    }

    document.getElementById('studentIdDisplay').textContent = currentStudentId;
    
    // Set current date in dashboard
    const dateEl = document.getElementById('currentDateBadge');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }

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
    await fetchTrainingTasks();
    initStars();
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
        setResumeTarget();
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
    
    let activeEl = itemEl;
    if (!activeEl) {
        activeEl = document.querySelector(`.class-item[data-id="${cls.id}"]`);
    }
    if (activeEl) {
        activeEl.classList.add('active');
    }

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

    // Toggle Details & Feedback display
    const placeholder = document.getElementById('noClassSelectedPlaceholder');
    if (placeholder) placeholder.style.display = 'none';
    const activeDetails = document.getElementById('activeClassDetails');
    if (activeDetails) activeDetails.style.display = 'block';

    // Set metadata
    document.getElementById('currentVideoTitle').textContent = cls.title;
    document.getElementById('currentVideoDesc').textContent = cls.description || 'No description provided for this class recording.';
    
    // Manage Download Notes button
    const notesBtn = document.getElementById('downloadNotesBtn');
    if (notesBtn) {
        if (cls.notes_url && cls.notes_url.trim() !== '') {
            notesBtn.href = cls.notes_url;
            notesBtn.style.display = 'inline-block';
        } else {
            notesBtn.href = '#';
            notesBtn.style.display = 'none';
        }
    }

    // Reset feedback section for this class
    selectedRating = 0;
    highlightStars(0);
    const commentEl = document.getElementById('feedbackComment');
    if (commentEl) commentEl.value = '';
    const statusEl = document.getElementById('feedbackStatus');
    if (statusEl) statusEl.style.display = 'none';
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
    setResumeTarget();
}

// Update Curriculum Progress statistics
function updateProgress() {
    if (classesList.length === 0) return;
    
    // Find intersection of current classes with completed list to handle deleted classes
    const validCompletions = completedClasses.filter(id => classesList.some(c => c.id === id));
    const percentage = Math.round((validCompletions.length / classesList.length) * 100);
    
    document.getElementById('progressPct').textContent = `${percentage}%`;
    document.getElementById('progressBarFill').style.width = `${percentage}%`;
    document.getElementById('statCompletedPct').textContent = `${percentage}%`;
}

// Set up the next class card to resume learning
function setResumeTarget() {
    if (classesList.length === 0) {
        document.getElementById('targetClassTitle').textContent = 'No classes available';
        resumeTargetClass = null;
        return;
    }

    // Find first class that is not completed
    const uncompleted = classesList.find(cls => !completedClasses.includes(cls.id));
    
    if (uncompleted) {
        resumeTargetClass = uncompleted;
        document.getElementById('targetClassTitle').textContent = uncompleted.title;
    } else {
        // If all are completed, target the first class
        resumeTargetClass = classesList[0];
        document.getElementById('targetClassTitle').textContent = classesList[0].title;
    }
}

// Click callback on "RESUME LEARNING" button
function resumeLastLearning() {
    if (!resumeTargetClass) return;
    
    // Switch to Recorded Classes tab view
    switchDashboardTab('recorded');
    
    // Select and load the target class
    selectClass(resumeTargetClass);
}

// Switch dashboard view panels
function switchDashboardTab(tabName) {
    // Remove active states from buttons
    document.querySelectorAll('.menu-item').forEach(btn => btn.classList.remove('active'));
    
    // Hide all view panels
    document.querySelectorAll('.dashboard-view-panel').forEach(panel => panel.classList.remove('active'));
    
    // Set active states
    const menuBtn = document.getElementById(`menu-${tabName}`);
    if (menuBtn) menuBtn.classList.add('active');
    
    let activePanelId = 'view-dashboard';
    if (tabName === 'live') activePanelId = 'view-live';
    else if (tabName === 'recorded') activePanelId = 'view-recorded';
    else if (tabName === 'downloads') activePanelId = 'view-downloads';
    
    const panel = document.getElementById(activePanelId);
    if (panel) panel.classList.add('active');
    
    if (tabName === 'dashboard') {
        fetchTrainingTasks();
    }
}

let selectedRating = 0;

// Initialize rating star events
function initStars() {
    const stars = document.querySelectorAll('.rating-stars .star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = parseInt(star.getAttribute('data-value'), 10);
            selectedRating = value;
            highlightStars(value);
        });
        star.addEventListener('mouseover', () => {
            const value = parseInt(star.getAttribute('data-value'), 10);
            highlightStars(value);
        });
        star.addEventListener('mouseout', () => {
            highlightStars(selectedRating);
        });
    });
}

// Highlight stars visually
function highlightStars(rating) {
    const stars = document.querySelectorAll('.rating-stars .star');
    stars.forEach(star => {
        const val = parseInt(star.getAttribute('data-value'), 10);
        if (val <= rating) {
            star.style.color = '#ffb700';
            star.style.textShadow = '0 0 8px rgba(255, 183, 0, 0.6)';
        } else {
            star.style.color = 'rgba(255, 255, 255, 0.15)';
            star.style.textShadow = 'none';
        }
    });
}

// Submit class feedback
async function submitFeedback(event) {
    event.preventDefault();
    if (!currentClassId) return;

    if (selectedRating === 0) {
        alert("Please select a star rating before submitting.");
        return;
    }

    const commentEl = document.getElementById('feedbackComment');
    const comment = commentEl ? commentEl.value.trim() : '';

    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'SUBMITTING...';
    }

    try {
        const response = await fetch(`${API}/api/training/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                class_id: currentClassId,
                rating: selectedRating,
                comment: comment
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || 'Failed to submit feedback');
        }

        const statusEl = document.getElementById('feedbackStatus');
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.textContent = '✓ Feedback submitted! Thank you.';
        }
    } catch (err) {
        console.error(err);
        alert(err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'SUBMIT FEEDBACK';
        }
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
window.switchDashboardTab = switchDashboardTab;
window.resumeLastLearning = resumeLastLearning;
window.submitFeedback = submitFeedback;


// ── Learn & Earn Portal Functions ──────────────────────────────
async function fetchTrainingTasks() {
    try {
        const response = await fetch(`${API}/api/training/tasks`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logoutStudent();
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load training tasks');
        }

        const tasks = await response.json();
        renderTrainingTasks(tasks);
    } catch (err) {
        console.error(err);
        document.getElementById('activeTasksContainer').innerHTML = 
            `<div style="text-align:center; padding: 20px; color: #ff6464; font-size:12px;">Error: ${err.message}</div>`;
    }
}

function renderTrainingTasks(tasks) {
    const activeContainer = document.getElementById('activeTasksContainer');
    const completedContainer = document.getElementById('completedTasksContainer');
    
    if (!activeContainer || !completedContainer) return;
    
    const activeTasks = tasks.filter(t => t.status === 'pending');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    // Update Stats and progress bar
    const completedCount = completedTasks.length;
    let totalBaseEarned = 0.00;
    let totalDeductions = 0.00;
    
    completedTasks.forEach(t => {
        totalBaseEarned += parseFloat(t.earned_amount || 0);
        totalDeductions += parseFloat(t.deduction_amount || 0);
    });
    
    const incentive = (completedCount >= 4) ? 50.00 : 0.00;
    const netEarnings = totalBaseEarned + incentive;
    
    document.getElementById('totalNetEarnings').textContent = `₹${netEarnings.toFixed(2)}`;
    document.getElementById('tasksCompletedCount').textContent = `${completedCount} Task${completedCount !== 1 ? 's' : ''}`;
    document.getElementById('earnedIncentive').textContent = `₹${incentive.toFixed(2)}`;
    document.getElementById('totalLateDeductions').textContent = `₹${totalDeductions.toFixed(2)}`;
    
    // Milestone progress elements
    const milestonePct = Math.min(Math.round((completedCount / 4) * 100), 100);
    document.getElementById('progressMilestoneLabel').textContent = `Tasks Completed: ${completedCount} / 4`;
    document.getElementById('progressMilestonePct').textContent = `${milestonePct}%`;
    document.getElementById('progressMilestoneBarFill').style.width = `${milestonePct}%`;
    
    const milestoneText = document.getElementById('incentiveMilestoneText');
    if (completedCount >= 4) {
        milestoneText.innerHTML = `🎉 ₹50.00 Milestone bonus earned!`;
        milestoneText.style.borderColor = 'var(--success)';
        milestoneText.style.color = 'var(--success)';
    } else {
        const remaining = 4 - completedCount;
        milestoneText.innerHTML = `Completed ${completedCount}/4 tasks. Complete ${remaining} more for ₹50.00 extra!`;
        milestoneText.style.borderColor = '';
        milestoneText.style.color = '';
    }

    // Group completed task rewards by weekday for the chart
    const dailyEarnings = {
        'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
    };
    completedTasks.forEach(task => {
        if (task.completed_at) {
            const date = new Date(task.completed_at);
            const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = daysMap[date.getDay()];
            if (dayName in dailyEarnings) {
                dailyEarnings[dayName] += parseFloat(task.earned_amount || 0);
            }
        }
    });
    
    const maxEarning = Math.max(...Object.values(dailyEarnings), 100);
    document.querySelectorAll('.earnings-bar-fill').forEach(bar => {
        const day = bar.getAttribute('data-day');
        if (day && day in dailyEarnings) {
            const earning = dailyEarnings[day];
            const pct = (earning / maxEarning) * 100;
            bar.style.height = `${pct}%`;
            bar.setAttribute('data-hours', `₹${earning.toFixed(2)}`);
        }
    });
    
    // Render Active Tasks
    if (activeTasks.length === 0) {
        activeContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-dim); font-size:12px;">🎉 All assigned tasks completed! Check back later for new tasks.</div>`;
    } else {
        activeContainer.innerHTML = '';
        activeTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'download-card'; // Reuse download-card styling for uniform aesthetics
            card.style.background = 'var(--panel-bg)';
            card.style.border = '1px solid var(--border)';
            card.style.borderRadius = '16px';
            card.style.padding = '20px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '15px';
            
            const deadlineDate = new Date(task.deadline);
            const now = new Date();
            const isOverdue = now > deadlineDate;
            const timeDiff = deadlineDate - now;
            
            let timeString = '';
            if (isOverdue) {
                timeString = `<span style="color: var(--danger); font-weight: bold;">⚠️ OVERDUE (50% late deduction will be applied)</span>`;
            } else {
                const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
                const minsLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                if (hoursLeft > 24) {
                    timeString = `<span style="color: var(--warning);">${Math.ceil(hoursLeft / 24)} days remaining</span>`;
                } else {
                    timeString = `<span style="color: var(--warning);">${hoursLeft}h ${minsLeft}m remaining</span>`;
                }
            }
            
            card.innerHTML = `
                <div class="download-top" style="margin-bottom:0;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 5px;">
                        <h4 style="font-family: 'Orbitron', sans-serif; font-size: 15px; font-weight: 700; color: #fff; margin:0;">${escapeHtml(task.title)}</h4>
                        <span class="download-format-badge blend" style="background: rgba(0, 255, 136, 0.08); border-color: rgba(0, 255, 136, 0.25); color: var(--success); font-family: monospace; font-size: 11px;">₹${parseFloat(task.reward_amount).toFixed(2)}</span>
                    </div>
                    <p style="margin-top: 5px; color: #c0c0cb; font-size: 12px; line-height: 1.6;">${escapeHtml(task.description)}</p>
                    
                    ${task.text_content ? `
                    <div style="margin-top: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 12px;">
                        <span style="font-size: 10px; text-transform: uppercase; color: var(--text-dim); font-weight: 600; display: block; margin-bottom: 5px;">Instructions / Task Text:</span>
                        <p style="margin: 0; font-family: monospace; font-size: 12px; white-space: pre-wrap; color: #e0e0ea; line-height: 1.5;">${escapeHtml(task.text_content)}</p>
                    </div>` : ''}
                    
                    <div style="margin-top: 10px; font-size: 11.5px; display: flex; align-items: center; gap: 5px;">
                        <span style="color: var(--text-dim);">Deadline:</span>
                        <strong style="color: #eee;">${deadlineDate.toLocaleString('en-GB')}</strong>
                        <span style="margin: 0 5px; color: rgba(255,255,255,0.15);">|</span>
                        <span>${timeString}</span>
                    </div>
                </div>
                
                <form onsubmit="submitTrainingTask(event, ${task.id})" style="display: flex; flex-direction: column; gap: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                    <textarea class="memo-scratchpad" placeholder="Type your response/submission text here..." style="min-height: 80px; font-size: 12.5px;" required></textarea>
                    <button type="submit" class="resume-learning-btn" style="width: auto; align-self: flex-start; padding: 10px 24px; font-size: 11px; margin-top: 5px;">SUBMIT COMPLETED WORK</button>
                </form>
            `;
            activeContainer.appendChild(card);
        });
    }
    
    // Render Completed Tasks
    if (completedTasks.length === 0) {
        completedContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-dim); font-size:12px;">No completed tasks logged yet. Make submissions to earn!</div>`;
    } else {
        completedContainer.innerHTML = '';
        completedTasks.forEach(task => {
            const card = document.createElement('div');
            card.style.background = 'rgba(255, 255, 255, 0.01)';
            card.style.border = '1px solid rgba(255, 255, 255, 0.04)';
            card.style.borderRadius = '12px';
            card.style.padding = '12px 15px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '6px';
            
            const compDate = new Date(task.completed_at).toLocaleDateString('en-GB');
            const penaltyStr = task.is_late 
                ? `<span style="color: var(--danger); font-size: 10.5px;">(Late Submission Penalty: -₹${parseFloat(task.deduction_amount).toFixed(2)})</span>` 
                : `<span style="color: var(--success); font-size: 10.5px;">(Submitted On Time)</span>`;
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h5 style="font-size: 13px; font-weight: 600; color: #fff; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 70%;" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</h5>
                    <strong style="color: #ffd700; font-family: monospace; font-size: 13px;">+₹${parseFloat(task.earned_amount).toFixed(2)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:5px;">
                    <span style="font-size: 10px; color: var(--text-dim);">Completed: ${compDate}</span>
                    <span>${penaltyStr}</span>
                </div>
                ${task.submission_text ? `
                <div style="margin-top: 4px; padding: 6px 8px; background: rgba(0,0,0,0.25); border-radius: 4px; font-family: monospace; font-size: 11px; color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(task.submission_text)}">
                    Response: "${escapeHtml(task.submission_text)}"
                </div>` : ''}
            `;
            completedContainer.appendChild(card);
        });
    }
}

async function submitTrainingTask(event, taskId) {
    event.preventDefault();
    const form = event.target;
    const textarea = form.querySelector('textarea');
    const submissionText = textarea.value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'SUBMITTING...';
    }
    
    try {
        const response = await fetch(`${API}/api/training/tasks/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                task_id: taskId,
                submission_text: submissionText
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || 'Failed to submit task');
        }

        const data = await response.json();
        alert(`✓ Task submitted successfully!\nEarned: ₹${data.earned_amount.toFixed(2)}${data.is_late ? ' (Late Submission Penalty Applied)' : ''}`);
        
        await fetchTrainingTasks();
    } catch (err) {
        console.error(err);
        alert(err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'SUBMIT COMPLETED WORK';
        }
    }
}

window.fetchTrainingTasks = fetchTrainingTasks;
window.submitTrainingTask = submitTrainingTask;



/* ═══════════════════════════════════════════
   TASK MARKETPLACE (STUDENT)
═══════════════════════════════════════════ */

let currentViewingTaskId = null;
let allMarketplaceTasks = [];
let myBidsList = [];

function switchStuTmTab(tabId) {
    document.querySelectorAll('.stu-tab-btn').forEach(b => b.classList.remove('active'));
    const clickedBtn = document.querySelector(`[data-target="${tabId}"]`);
    if (clickedBtn) clickedBtn.classList.add('active');
    
    document.querySelectorAll('.stu-tm-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(tabId);
    if (panel) panel.classList.add('active');

    if (tabId === 'stu-tasks-avail') renderAvailableTasks();
    if (tabId === 'stu-tasks-bids') renderMyBids();
    if (tabId === 'stu-tasks-assigned') renderAssignedTasks();
}

async function renderAvailableTasks() {
    const grid = document.getElementById('stuAvailGrid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-dim);">Loading available tasks...</div>';
    
    try {
        const tasks = await api('/api/training/marketplace/tasks');
        allMarketplaceTasks = tasks || [];
        
        grid.innerHTML = '';
        if (allMarketplaceTasks.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-dim);">No tasks available for bidding right now. Check back later!</div>';
            return;
        }
        
        allMarketplaceTasks.forEach(t => {
            let meta = {};
            try {
                meta = JSON.parse(t.text_content);
            } catch (e) {
                meta = {
                    description: t.description,
                    difficulty: 'Beginner',
                    skills: 'General',
                    category: 'Training',
                    priority: 'Medium'
                };
            }
            
            const difficulty = meta.difficulty || 'Beginner';
            let diffClass = 'diff-beginner';
            if (difficulty === 'Intermediate') diffClass = 'diff-intermediate';
            if (difficulty === 'Advanced') diffClass = 'diff-advanced';
            
            const skills = meta.skills || 'General';
            const skillsHtml = skills.split(',').map(s => `<span class="tm-skill">${escapeHtml(s.trim())}</span>`).join('');
            const desc = meta.description || t.description || '';
            const bidsCount = t.bids_count || 0;
            const deadlineDate = new Date(t.deadline).toLocaleString('en-GB');
            
            const bidBtnText = t.my_bid_amount !== null ? `Update Bid (₹${parseFloat(t.my_bid_amount).toFixed(2)})` : 'View Details';
            
            grid.innerHTML += `
                <div class="tm-card">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span class="tm-badge ${diffClass}">${escapeHtml(difficulty)}</span>
                        <span style="font-size:11px; color:var(--text-dim);">⏳ ${deadlineDate}</span>
                    </div>
                    <h3 class="tm-card-title">${escapeHtml(t.title)}</h3>
                    <div style="margin-bottom:10px;">${skillsHtml}</div>
                    <p class="tm-card-desc">${escapeHtml(desc)}</p>
                    <div class="tm-meta-row">
                        <span style="font-size:12px; color:var(--text-dim);">🎯 ${bidsCount} Bid${bidsCount !== 1 ? 's' : ''}</span>
                        <button class="resume-learning-btn" style="padding:6px 12px; font-size:11px;" onclick="viewTaskDetails(${t.id})">${escapeHtml(bidBtnText)}</button>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#ff6464;">Error: ${escapeHtml(err.message)}</div>`;
    }
}

function viewTaskDetails(taskId) {
    const t = allMarketplaceTasks.find(x => x.id === taskId);
    if (!t) return;
    
    currentViewingTaskId = taskId;
    
    document.getElementById('tdModalTitle').innerText = t.title;
    
    let meta = {};
    try {
        meta = JSON.parse(t.text_content);
    } catch (e) {
        meta = {
            description: t.description,
            difficulty: 'Beginner',
            skills: 'General',
            category: 'Training',
            priority: 'Medium'
        };
    }
    
    const difficulty = meta.difficulty || 'Beginner';
    let diffClass = 'diff-beginner';
    if (difficulty === 'Intermediate') diffClass = 'diff-intermediate';
    if (difficulty === 'Advanced') diffClass = 'diff-advanced';
    
    const diffBadge = document.getElementById('tdModalDiff');
    diffBadge.className = `tm-badge ${diffClass}`;
    diffBadge.innerText = difficulty;
    
    const deadlineDate = new Date(t.deadline).toLocaleString('en-GB');
    document.getElementById('tdModalDeadline').innerText = 'Deadline: ' + deadlineDate;
    
    const lowestBidVal = t.lowest_bid !== null ? `₹${parseFloat(t.lowest_bid).toFixed(2)}` : `₹${parseFloat(t.reward_amount).toFixed(2)} (Highest Bid)`;
    document.getElementById('tdModalLowestBid').innerText = lowestBidVal;
    
    const desc = meta.description || t.description || '';
    document.getElementById('tdModalDesc').innerText = desc;
    
    const skills = meta.skills || 'General';
    document.getElementById('tdModalSkills').innerHTML = skills.split(',').map(s => `<span class="tm-skill">${escapeHtml(s.trim())}</span>`).join('');
    
    document.getElementById('taskDetailModal').classList.add('active');
}

function closeTmModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openBidModal() {
    closeTmModal('taskDetailModal');
    
    // Pre-fill if there is an existing bid
    const t = allMarketplaceTasks.find(x => x.id === currentViewingTaskId);
    if (t && t.my_bid_amount !== null) {
        document.getElementById('bid_amt').value = t.my_bid_amount;
        
        // Find existing bid details from myBidsList if present to get delivery days & message
        const existingBid = myBidsList.find(b => b.task_id === currentViewingTaskId);
        if (existingBid) {
            document.getElementById('bid_time').value = existingBid.delivery_days;
            document.getElementById('bid_msg').value = existingBid.proposal_message;
        } else {
            document.getElementById('bid_time').value = '';
            document.getElementById('bid_msg').value = '';
        }
    } else {
        document.getElementById('bid_amt').value = '';
        document.getElementById('bid_time').value = '';
        document.getElementById('bid_msg').value = '';
    }
    
    document.getElementById('submitBidModal').classList.add('active');
}

async function handleStudentBid(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('bid_amt').value) || 0;
    const days = parseInt(document.getElementById('bid_time').value) || 0;
    const message = document.getElementById('bid_msg').value.trim();
    
    if (amount <= 0 || days <= 0) {
        alert("Amount and days must be positive.");
        return;
    }
    
    try {
        await api('/api/training/marketplace/bid', {
            method: 'POST',
            body: JSON.stringify({
                task_id: currentViewingTaskId,
                bid_amount: amount,
                delivery_days: days,
                proposal_message: message
            })
        });
        
        alert("Bid placed successfully!");
        closeTmModal('submitBidModal');
        document.getElementById('bidForm').reset();
        switchStuTmTab('stu-tasks-bids');
    } catch (err) {
        alert("Failed to submit bid: " + err.message);
    }
}

async function renderMyBids() {
    const tbody = document.getElementById('stuBidsTable');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-dim);">Loading your bids...</td></tr>';
    
    try {
        const bids = await api('/api/training/marketplace/my-bids');
        myBidsList = bids || [];
        
        tbody.innerHTML = '';
        if (myBidsList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-dim);">No bids placed yet.</td></tr>';
            return;
        }
        
        myBidsList.forEach(b => {
            let statusColor = '#00f0ff'; // pending
            if (b.status === 'accepted') statusColor = '#00E676';
            if (b.status === 'rejected') statusColor = '#FF1744';
            
            const displayStatus = b.status.charAt(0).toUpperCase() + b.status.slice(1);
            
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 12px 10px; font-weight:bold; color:#eee;">${escapeHtml(b.task_title)}</td>
                    <td style="padding: 12px 10px; color:#ffd700; font-weight:bold;">₹${parseFloat(b.bid_amount).toFixed(2)}</td>
                    <td style="padding: 12px 10px;">${b.delivery_days} Days</td>
                    <td style="padding: 12px 10px; color:${statusColor}; font-weight:600;">${displayStatus}</td>
                </tr>
            `;
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--danger);">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
}

async function renderAssignedTasks() {
    const tbody = document.getElementById('stuAssignedTable');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--text-dim);">Loading assigned tasks...</td></tr>';
    
    try {
        const tasks = await api('/api/training/marketplace/assigned-tasks');
        const list = tasks || [];
        
        tbody.innerHTML = '';
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--text-dim);">No active tasks assigned.</td></tr>';
            return;
        }
        
        list.forEach(t => {
            const deadlineDate = new Date(t.deadline).toLocaleString('en-GB');
            let statusColor = '#FFD600'; // Assigned
            let actionBtn = `<button class="resume-learning-btn" style="padding:5px 10px; font-size:11px;" onclick="openTaskSubmission(${t.id})">Submit Work</button>`;
            
            if (t.status === 'Submitted') {
                statusColor = '#00f0ff';
                actionBtn = `<span style="font-size:11px; color:var(--text-dim);">Awaiting Review</span>`;
            }
            
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 15px 20px; font-weight:bold; color:#eee;">${escapeHtml(t.title)}</td>
                    <td style="padding: 15px 20px;">${deadlineDate}</td>
                    <td style="padding: 15px 20px; color:${statusColor}; font-weight:600;">${escapeHtml(t.status)}</td>
                    <td style="padding: 15px 20px; text-align: right;">${actionBtn}</td>
                </tr>
            `;
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--danger);">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function openTaskSubmission(taskId) {
    currentViewingTaskId = taskId;
    document.getElementById('taskSubmissionModal').classList.add('active');
}

async function handleStudentSubmission(e) {
    e.preventDefault();
    
    const githubUrl = document.getElementById('sub_github').value.trim();
    const demoUrl = document.getElementById('sub_demo').value.trim();
    const notes = document.getElementById('sub_notes').value.trim();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'SUBMITTING...';
    }
    
    try {
        await api('/api/training/marketplace/submit', {
            method: 'POST',
            body: JSON.stringify({
                task_id: currentViewingTaskId,
                github_url: githubUrl,
                demo_url: demoUrl,
                notes: notes
            })
        });
        
        alert("Task Submitted for Admin Review!");
        closeTmModal('taskSubmissionModal');
        document.getElementById('submissionForm').reset();
        await renderAssignedTasks();
    } catch (err) {
        alert("Failed to submit work: " + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Task';
        }
    }
}

async function updateStudentDashboardStats() {
    try {
        // Fetch all assigned/completed tasks
        const tasks = await api('/api/training/tasks');
        const list = tasks || [];
        
        const completed = list.filter(t => t.status === 'completed');
        const active = list.filter(t => t.status === 'pending' && !t.submission_text);
        const pending = list.filter(t => t.status === 'pending' && t.submission_text);
        
        let totalBaseEarned = 0;
        completed.forEach(t => {
            totalBaseEarned += parseFloat(t.earned_amount || 0);
        });
        
        const incentive = (completed.length >= 4) ? 50.00 : 0.00;
        const netEarnings = totalBaseEarned + incentive;
        
        let elTotal = document.getElementById('stuTotalEarnings');
        let elComp = document.getElementById('stuCompletedTasks');
        let elActive = document.getElementById('stuActiveTasks');
        let elPend = document.getElementById('stuPendingApproval');
        
        if (elTotal) elTotal.innerText = `₹${netEarnings.toFixed(2)}`;
        if (elComp) elComp.innerText = completed.length;
        if (elActive) elActive.innerText = active.length;
        if (elPend) elPend.innerText = pending.length;
        
        // Populate Recent Transactions Table
        const transTbody = document.getElementById('stuTransactionsTable');
        if (transTbody) {
            transTbody.innerHTML = '';
            if (completed.length === 0) {
                transTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-dim);">No transactions yet.</td></tr>';
            } else {
                completed.forEach(t => {
                    const compDate = t.completed_at ? new Date(t.completed_at).toLocaleDateString() : new Date().toLocaleDateString();
                    transTbody.innerHTML += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 12px 5px; font-weight: 500; color:#eee;">${escapeHtml(t.title)}</td>
                            <td style="padding: 12px 5px; color:#00E676; font-weight:bold;">+₹${parseFloat(t.earned_amount).toFixed(2)}</td>
                            <td style="padding: 12px 5px;">${compDate}</td>
                            <td style="padding: 12px 5px;"><span class="tm-badge" style="color:#00E676; border-color:rgba(0,230,118,0.3); background:rgba(0,230,118,0.1);">Paid</span></td>
                        </tr>
                    `;
                });
            }
        }
        
        // Populate Global Leaderboard Table from live endpoint
        const lbTbody = document.getElementById('stuLeaderboardTable');
        if (lbTbody) {
            lbTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-dim);">Loading leaderboard...</td></tr>';
            
            try {
                const leaderboard = await api('/api/training/leaderboard');
                const sorted = leaderboard || [];
                
                lbTbody.innerHTML = '';
                if (sorted.length === 0) {
                    lbTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-dim);">No rankings available.</td></tr>';
                } else {
                    sorted.slice(0, 10).forEach((s, idx) => {
                        let rankColor = idx === 0 ? 'var(--gold)' : (idx === 1 ? '#C0C0C0' : (idx === 2 ? '#CD7F32' : 'var(--text-dim)'));
                        const isSelf = s.student_id === currentStudentId ? 'style="background:rgba(255,25,25,0.05); font-weight:bold;"' : '';
                        
                        lbTbody.innerHTML += `
                            <tr ${isSelf} style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td style="padding: 12px 5px; font-weight:bold; color:${rankColor};">#${idx+1}</td>
                                <td style="padding: 12px 5px; color:#eee;">${escapeHtml(s.student_id)} ${s.student_id === currentStudentId ? ' (You)' : ''}</td>
                                <td style="padding: 12px 5px; color:var(--primary); font-weight:bold;">${s.points} pts</td>
                                <td style="padding: 12px 5px;">${s.completed_tasks}</td>
                            </tr>
                        `;
                    });
                }
            } catch (lErr) {
                lbTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--danger);">Error loading leaderboard</td></tr>`;
            }
        }
    } catch (err) {
        console.error("Stats update failed:", err);
    }
}

// Hook into existing switchDashboardTab
const oldSwitchDashboardTab = switchDashboardTab;
switchDashboardTab = function(tabId) {
    if (oldSwitchDashboardTab) oldSwitchDashboardTab(tabId);
    
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    const clicked = document.getElementById('menu-' + tabId);
    if (clicked) clicked.classList.add('active');

    document.querySelectorAll('.dashboard-view-panel').forEach(panel => panel.classList.remove('active'));
    const panel = document.getElementById('view-' + tabId);
    if (panel) panel.classList.add('active');
    
    if (tabId === 'tasks') {
        switchStuTmTab('stu-tasks-avail');
    }
    
    if (tabId === 'dashboard') {
        updateStudentDashboardStats();
    }
};

window.addEventListener('load', () => {
    updateStudentDashboardStats();
});

// Bindings to window for HTML actions
window.switchStuTmTab = switchStuTmTab;
window.viewTaskDetails = viewTaskDetails;
window.closeTmModal = closeTmModal;
window.openBidModal = openBidModal;
window.handleStudentBid = handleStudentBid;
window.renderMyBids = renderMyBids;
window.renderAssignedTasks = renderAssignedTasks;
window.openTaskSubmission = openTaskSubmission;
window.handleStudentSubmission = handleStudentSubmission;
window.updateStudentDashboardStats = updateStudentDashboardStats;

