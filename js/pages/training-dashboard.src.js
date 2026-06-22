// API base set by js/api-config.js
const API = window.API_BASE || '';
let token = null;
let currentStudentId = '';
let classesList = [];
let completedClasses = [];
let currentClassId = null;
let resumeTargetClass = null;

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

