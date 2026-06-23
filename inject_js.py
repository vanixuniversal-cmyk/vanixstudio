import os

base_dir = r"c:\xampp\htdocs\vanixstudio"

# 1. Update super-admin.src.js
sa_js_path = os.path.join(base_dir, "js", "pages", "super-admin.src.js")
with open(sa_js_path, "r", encoding="utf-8") as f:
    sa_js = f.read()

# I will append the JS functions at the end of the file
new_sa_js = """

/* ═══════════════════════════════════════════
   TASK MARKETPLACE (ADMIN)
═══════════════════════════════════════════ */

// Mock store
const tmStore = {
    tasks: [],
    bids: []
};

function switchTmTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-target="${tabId}"]`).classList.add('active');
    document.querySelectorAll('.tm-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    if(tabId === 'tm-manage') renderTmManageTable();
    if(tabId === 'tm-bids') renderReviewBidsSelect();
    if(tabId === 'tm-analytics') updateTmAnalytics();
}

function handleCreateTask(e) {
    e.preventDefault();
    const task = {
        id: 'TASK-' + Math.floor(Math.random()*10000),
        title: document.getElementById('ct_title').value,
        desc: document.getElementById('ct_desc').value,
        skills: document.getElementById('ct_skills').value,
        category: document.getElementById('ct_category').value,
        difficulty: document.getElementById('ct_difficulty').value,
        deadline: document.getElementById('ct_deadline').value,
        budget: document.getElementById('ct_budget').value,
        priority: document.getElementById('ct_priority').value,
        status: 'Open',
        bids: 0,
        assignedTo: null,
        created: new Date().toISOString()
    };
    
    let existingTasks = JSON.parse(localStorage.getItem('vanix_tm_tasks') || '[]');
    existingTasks.push(task);
    localStorage.setItem('vanix_tm_tasks', JSON.stringify(existingTasks));
    
    alert("Task Posted! It is now OPEN FOR BIDDING.");
    document.getElementById('createTaskForm').reset();
    switchTmTab('tm-manage');
    
    // Dispatch event to update cross-dashboard data
    window.dispatchEvent(new Event('tm_data_updated'));
}

function renderTmManageTable() {
    let existingTasks = JSON.parse(localStorage.getItem('vanix_tm_tasks') || '[]');
    const tbody = document.getElementById('tmManageTable');
    tbody.innerHTML = '';
    
    if(existingTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-dim);">No tasks created yet.</td></tr>';
        return;
    }
    
    existingTasks.forEach(t => {
        let statusColor = t.status === 'Open' ? '#00f0ff' : (t.status === 'Assigned' || t.status === 'In Progress' ? '#FFD600' : (t.status === 'Completed' || t.status === 'Approved' ? '#00E676' : 'var(--text-dim)'));
        let actions = `<button style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:12px; margin-right:10px;">Edit</button>
                       <button style="background:none; border:none; color:var(--text-dim); cursor:pointer; font-size:12px;" onclick="deleteTmTask('${t.id}')">Delete</button>`;
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding:15px 10px; font-weight:bold;">${t.title}</td>
                <td style="padding:15px 10px;">${t.difficulty}</td>
                <td style="padding:15px 10px;">${t.deadline}</td>
                <td style="padding:15px 10px; color:${statusColor}; font-weight:600;">${t.status}</td>
                <td style="padding:15px 10px;">${t.bids}</td>
                <td style="padding:15px 10px;">${t.assignedTo || '-'}</td>
                <td style="padding:15px 10px;">${actions}</td>
            </tr>
        `;
    });
}

function deleteTmTask(id) {
    if(!confirm('Delete this task?')) return;
    let existingTasks = JSON.parse(localStorage.getItem('vanix_tm_tasks') || '[]');
    existingTasks = existingTasks.filter(t => t.id !== id);
    localStorage.setItem('vanix_tm_tasks', JSON.stringify(existingTasks));
    renderTmManageTable();
}

function renderReviewBidsSelect() {
    let existingTasks = JSON.parse(localStorage.getItem('vanix_tm_tasks') || '[]');
    const select = document.getElementById('reviewBidTaskSelect');
    select.innerHTML = '<option value="">-- Select an Open Task --</option>';
    
    existingTasks.filter(t => t.status === 'Open').forEach(t => {
        select.innerHTML += `<option value="${t.id}">${t.title}</option>`;
    });
    document.getElementById('tmBidsTable').innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding:20px;">Select a task to review bids.</td></tr>';
}

function loadBidsForTask() {
    const taskId = document.getElementById('reviewBidTaskSelect').value;
    const tbody = document.getElementById('tmBidsTable');
    if(!taskId) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding:20px;">Select a task to review bids.</td></tr>';
        return;
    }
    
    let allBids = JSON.parse(localStorage.getItem('vanix_tm_bids') || '[]');
    let taskBids = allBids.filter(b => b.taskId === taskId && b.status === 'Pending');
    
    if(taskBids.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding:20px;">No pending bids for this task.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    taskBids.forEach(b => {
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding:15px 10px;">${b.studentName}</td>
                <td style="padding:15px 10px; font-weight:bold; color:#00E676;">₹${b.amount}</td>
                <td style="padding:15px 10px;">${b.days} Days</td>
                <td style="padding:15px 10px;">12</td>
                <td style="padding:15px 10px;">95%</td>
                <td style="padding:15px 10px; color:#FFD600;">★★★★☆ 4.8</td>
                <td style="padding:15px 10px;">
                    <button style="background:var(--primary); color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;" onclick="assignTaskToBid('${taskId}', '${b.id}', '${b.studentName}')">Assign</button>
                </td>
            </tr>
        `;
    });
}

function assignTaskToBid(taskId, bidId, studentName) {
    if(!confirm(`Assign this task to ${studentName}?`)) return;
    
    // Update task
    let existingTasks = JSON.parse(localStorage.getItem('vanix_tm_tasks') || '[]');
    let t = existingTasks.find(x => x.id === taskId);
    if(t) {
        t.status = 'Assigned';
        t.assignedTo = studentName;
    }
    localStorage.setItem('vanix_tm_tasks', JSON.stringify(existingTasks));
    
    // Update bids
    let allBids = JSON.parse(localStorage.getItem('vanix_tm_bids') || '[]');
    allBids.forEach(b => {
        if(b.taskId === taskId) {
            if(b.id === bidId) b.status = 'Selected';
            else b.status = 'Rejected';
        }
    });
    localStorage.setItem('vanix_tm_bids', JSON.stringify(allBids));
    
    alert(`Task Assigned to ${studentName}! Notification Sent.`);
    loadBidsForTask();
    
    // Dispatch event
    window.dispatchEvent(new Event('tm_data_updated'));
}

function updateTmAnalytics() {
    let existingTasks = JSON.parse(localStorage.getItem('vanix_tm_tasks') || '[]');
    let allBids = JSON.parse(localStorage.getItem('vanix_tm_bids') || '[]');
    
    document.getElementById('ana_total').innerText = existingTasks.length;
    document.getElementById('ana_open').innerText = existingTasks.filter(t => t.status === 'Open').length;
    document.getElementById('ana_assigned').innerText = existingTasks.filter(t => ['Assigned', 'In Progress', 'Submitted'].includes(t.status)).length;
    document.getElementById('ana_completed').innerText = existingTasks.filter(t => ['Approved', 'Completed'].includes(t.status)).length;
    document.getElementById('ana_bids').innerText = allBids.length;
}

// Ensure section logic handles new menu
const oldShowSectionSA = showSection;
showSection = function(sectionId) {
    if(oldShowSectionSA) {
        document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        
        let sec = document.getElementById('section-' + sectionId);
        if(sec) sec.style.display = 'block';
        
        let nav = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
        if(nav) nav.classList.add('active');
        
        if(sectionId === 'task-marketplace') {
            switchTmTab('tm-manage');
        }
    }
};

"""
if "TASK MARKETPLACE (ADMIN)" not in sa_js:
    sa_js += new_sa_js
    with open(sa_js_path, "w", encoding="utf-8") as f:
        f.write(sa_js)

# 2. Update training-dashboard.src.js
td_js_path = os.path.join(base_dir, "js", "pages", "training-dashboard.src.js")
with open(td_js_path, "r", encoding="utf-8") as f:
    td_js = f.read()

new_td_js = """

/* ═══════════════════════════════════════════
   TASK MARKETPLACE (STUDENT)
═══════════════════════════════════════════ */

let currentViewingTaskId = null;
const MOCK_STUDENT_NAME = "John Doe (STU-101)"; // Normally from auth

function switchStuTmTab(tabId) {
    document.querySelectorAll('.stu-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-target="${tabId}"]`).classList.add('active');
    document.querySelectorAll('.stu-tm-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    if(tabId === 'stu-tasks-avail') renderAvailableTasks();
    if(tabId === 'stu-tasks-bids') renderMyBids();
    if(tabId === 'stu-tasks-assigned') renderAssignedTasks();
}

function renderAvailableTasks() {
    let existingTasks = JSON.parse(localStorage.getItem('vanix_tm_tasks') || '[]');
    let openTasks = existingTasks.filter(t => t.status === 'Open');
    
    const grid = document.getElementById('stuAvailGrid');
    grid.innerHTML = '';
    
    if(openTasks.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-dim);">No tasks available for bidding right now. Check back later!</div>';
        return;
    }
    
    openTasks.forEach(t => {
        let diffClass = 'diff-beginner';
        if(t.difficulty === 'Intermediate') diffClass = 'diff-intermediate';
        if(t.difficulty === 'Advanced') diffClass = 'diff-advanced';
        
        let skillsHtml = t.skills.split(',').map(s => `<span class="tm-skill">${s.trim()}</span>`).join('');
        
        grid.innerHTML += `
            <div class="tm-card">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span class="tm-badge ${diffClass}">${t.difficulty}</span>
                    <span style="font-size:11px; color:var(--text-dim);">⏳ ${t.deadline}</span>
                </div>
                <h3 class="tm-card-title">${t.title}</h3>
                <div style="margin-bottom:10px;">${skillsHtml}</div>
                <p class="tm-card-desc">${t.desc}</p>
                <div class="tm-meta-row">
                    <span style="font-size:12px; color:var(--text-dim);">🎯 ${t.bids} Bids</span>
                    <button class="resume-learning-btn" style="padding:6px 12px; font-size:11px;" onclick="viewTaskDetails('${t.id}')">View Details</button>
                </div>
            </div>
        `;
    });
}

function viewTaskDetails(taskId) {
    let existingTasks = JSON.parse(localStorage.getItem('vanix_tm_tasks') || '[]');
    let t = existingTasks.find(x => x.id === taskId);
    if(!t) return;
    
    currentViewingTaskId = taskId;
    
    document.getElementById('tdModalTitle').innerText = t.title;
    
    let diffClass = 'diff-beginner';
    if(t.difficulty === 'Intermediate') diffClass = 'diff-intermediate';
    if(t.difficulty === 'Advanced') diffClass = 'diff-advanced';
    
    let diffBadge = document.getElementById('tdModalDiff');
    diffBadge.className = `tm-badge ${diffClass}`;
    diffBadge.innerText = t.difficulty;
    
    document.getElementById('tdModalDeadline').innerText = 'Deadline: ' + t.deadline;
    document.getElementById('tdModalLowestBid').innerText = t.budget ? `₹${t.budget}` : 'N/A';
    document.getElementById('tdModalDesc').innerText = t.desc;
    
    document.getElementById('tdModalSkills').innerHTML = t.skills.split(',').map(s => `<span class="tm-skill">${s.trim()}</span>`).join('');
    
    document.getElementById('taskDetailModal').classList.add('active');
}

function closeTmModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openBidModal() {
    closeTmModal('taskDetailModal');
    document.getElementById('submitBidModal').classList.add('active');
}

function handleStudentBid(e) {
    e.preventDefault();
    const bid = {
        id: 'BID-' + Math.floor(Math.random()*10000),
        taskId: currentViewingTaskId,
        studentName: MOCK_STUDENT_NAME,
        amount: document.getElementById('bid_amt').value,
        days: document.getElementById('bid_time').value,
        message: document.getElementById('bid_msg').value,
        status: 'Pending',
        created: new Date().toISOString()
    };
    
    let allBids = JSON.parse(localStorage.getItem('vanix_tm_bids') || '[]');
    allBids.push(bid);
    localStorage.setItem('vanix_tm_bids', JSON.stringify(allBids));
    
    let existingTasks = JSON.parse(localStorage.getItem('vanix_tm_tasks') || '[]');
    let t = existingTasks.find(x => x.id === currentViewingTaskId);
    if(t) {
        t.bids = (t.bids || 0) + 1;
        localStorage.setItem('vanix_tm_tasks', JSON.stringify(existingTasks));
    }
    
    alert("Bid submitted successfully!");
    closeTmModal('submitBidModal');
    document.getElementById('bidForm').reset();
    switchStuTmTab('stu-tasks-bids');
    
    // Refresh availability
    renderAvailableTasks();
}

function renderMyBids() {
    let existingTasks = JSON.parse(localStorage.getItem('vanix_tm_tasks') || '[]');
    let allBids = JSON.parse(localStorage.getItem('vanix_tm_bids') || '[]');
    let myBids = allBids.filter(b => b.studentName === MOCK_STUDENT_NAME);
    
    const tbody = document.getElementById('stuBidsTable');
    tbody.innerHTML = '';
    
    if(myBids.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-dim);">No bids placed yet.</td></tr>';
        return;
    }
    
    myBids.forEach(b => {
        let t = existingTasks.find(x => x.id === b.taskId);
        let taskName = t ? t.title : 'Unknown Task';
        
        let statusColor = b.status === 'Pending' ? '#00f0ff' : (b.status === 'Selected' ? '#00E676' : '#FF1744');
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 12px 10px; font-weight:bold;">${taskName}</td>
                <td style="padding: 12px 10px;">₹${b.amount}</td>
                <td style="padding: 12px 10px;">${b.days} Days</td>
                <td style="padding: 12px 10px; color:${statusColor}; font-weight:600;">${b.status}</td>
            </tr>
        `;
    });
}

function renderAssignedTasks() {
    let existingTasks = JSON.parse(localStorage.getItem('vanix_tm_tasks') || '[]');
    let assigned = existingTasks.filter(t => t.assignedTo === MOCK_STUDENT_NAME && t.status !== 'Completed');
    
    const tbody = document.getElementById('stuAssignedTable');
    tbody.innerHTML = '';
    
    if(assigned.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--text-dim);">No active tasks assigned.</td></tr>';
        return;
    }
    
    assigned.forEach(t => {
        let statusColor = t.status === 'Assigned' ? '#FFD600' : (t.status === 'Submitted' ? '#00f0ff' : (t.status === 'Approved' ? '#00E676' : 'var(--text-dim)'));
        let actionBtn = `<button class="resume-learning-btn" style="padding:5px 10px; font-size:11px;" onclick="openTaskSubmission('${t.id}')">Submit Work</button>`;
        if(t.status === 'Submitted') actionBtn = `<span style="font-size:11px; color:var(--text-dim);">Awaiting Review</span>`;
        if(t.status === 'Approved') actionBtn = `<button class="resume-learning-btn" style="padding:5px 10px; font-size:11px; background:#00E676; color:#000;">Mark Completed</button>`;
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 15px 20px; font-weight:bold;">${t.title}</td>
                <td style="padding: 15px 20px;">${t.deadline}</td>
                <td style="padding: 15px 20px; color:${statusColor}; font-weight:600;">${t.status}</td>
                <td style="padding: 15px 20px; text-align: right;">${actionBtn}</td>
            </tr>
        `;
    });
}

function openTaskSubmission(taskId) {
    currentViewingTaskId = taskId;
    document.getElementById('taskSubmissionModal').classList.add('active');
}

function handleStudentSubmission(e) {
    e.preventDefault();
    
    let existingTasks = JSON.parse(localStorage.getItem('vanix_tm_tasks') || '[]');
    let t = existingTasks.find(x => x.id === currentViewingTaskId);
    if(t) {
        t.status = 'Submitted';
        localStorage.setItem('vanix_tm_tasks', JSON.stringify(existingTasks));
    }
    
    alert("Task Submitted for Admin Review!");
    closeTmModal('taskSubmissionModal');
    document.getElementById('submissionForm').reset();
    renderAssignedTasks();
}

function updateStudentDashboardStats() {
    let existingTasks = JSON.parse(localStorage.getItem('vanix_tm_tasks') || '[]');
    let allBids = JSON.parse(localStorage.getItem('vanix_tm_bids') || '[]');
    
    let myTasks = existingTasks.filter(t => t.assignedTo === MOCK_STUDENT_NAME);
    let completed = myTasks.filter(t => ['Approved', 'Completed'].includes(t.status));
    let active = myTasks.filter(t => ['Assigned', 'In Progress'].includes(t.status));
    let pending = myTasks.filter(t => t.status === 'Submitted');
    
    // Earnings calculation based on accepted bids
    let earnings = 0;
    completed.forEach(ct => {
        let winningBid = allBids.find(b => b.taskId === ct.id && b.status === 'Selected');
        if(winningBid) earnings += parseInt(winningBid.amount) || 0;
    });
    
    let elTotal = document.getElementById('stuTotalEarnings');
    let elComp = document.getElementById('stuCompletedTasks');
    let elActive = document.getElementById('stuActiveTasks');
    let elPend = document.getElementById('stuPendingApproval');
    
    if(elTotal) elTotal.innerText = `₹${earnings}`;
    if(elComp) elComp.innerText = completed.length;
    if(elActive) elActive.innerText = active.length;
    if(elPend) elPend.innerText = pending.length;
    
    // Recent Transactions
    let transTbody = document.getElementById('stuTransactionsTable');
    if(transTbody) {
        transTbody.innerHTML = '';
        if(completed.length === 0) {
            transTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-dim);">No transactions yet.</td></tr>';
        } else {
            completed.forEach(ct => {
                let winningBid = allBids.find(b => b.taskId === ct.id && b.status === 'Selected');
                let amt = winningBid ? winningBid.amount : 0;
                transTbody.innerHTML += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 12px 5px;">${ct.title}</td>
                        <td style="padding: 12px 5px; color:#00E676; font-weight:bold;">+₹${amt}</td>
                        <td style="padding: 12px 5px;">${new Date().toLocaleDateString()}</td>
                        <td style="padding: 12px 5px;"><span class="tm-badge" style="color:#00E676; border-color:rgba(0,230,118,0.3); background:rgba(0,230,118,0.1);">Paid</span></td>
                    </tr>
                `;
            });
        }
    }
    
    // Leaderboard
    let lbTbody = document.getElementById('stuLeaderboardTable');
    if(lbTbody) {
        let students = {};
        allBids.filter(b => b.status === 'Selected').forEach(b => {
            if(!students[b.studentName]) students[b.studentName] = { points:0, tasks:0 };
            let t = existingTasks.find(x => x.id === b.taskId);
            if(t && ['Approved', 'Completed'].includes(t.status)) {
                students[b.studentName].tasks++;
                students[b.studentName].points += 50; // 50 pts per task
            }
        });
        // Include mock current student if not there
        if(!students[MOCK_STUDENT_NAME]) students[MOCK_STUDENT_NAME] = { points:0, tasks:0 };
        students[MOCK_STUDENT_NAME].tasks = completed.length;
        students[MOCK_STUDENT_NAME].points = completed.length * 50;
        
        let sorted = Object.keys(students).map(k => ({name:k, ...students[k]})).sort((a,b) => b.points - a.points);
        
        lbTbody.innerHTML = '';
        sorted.slice(0,10).forEach((s, idx) => {
            let rankColor = idx === 0 ? 'var(--gold)' : (idx === 1 ? '#C0C0C0' : (idx === 2 ? '#CD7F32' : 'var(--text-dim)'));
            lbTbody.innerHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 12px 5px; font-weight:bold; color:${rankColor};">#${idx+1}</td>
                    <td style="padding: 12px 5px;">${s.name}</td>
                    <td style="padding: 12px 5px; color:var(--primary);">${s.points} pts</td>
                    <td style="padding: 12px 5px;">${s.tasks}</td>
                </tr>
            `;
        });
    }
}

// Hook into existing switchDashboardTab if possible to initialize
const oldSwitchDashboardTab = switchDashboardTab;
switchDashboardTab = function(tabId) {
    if(oldSwitchDashboardTab) oldSwitchDashboardTab(tabId);
    
    // Handle our new task tab explicitly since the old func might not know it
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    let clicked = document.getElementById('menu-' + tabId);
    if(clicked) clicked.classList.add('active');

    document.querySelectorAll('.dashboard-view-panel').forEach(panel => panel.classList.remove('active'));
    let panel = document.getElementById('view-' + tabId);
    if(panel) panel.classList.add('active');
    
    if(tabId === 'tasks') {
        switchStuTmTab('stu-tasks-avail');
    }
    
    if(tabId === 'dashboard') {
        updateStudentDashboardStats();
    }
};

window.addEventListener('load', () => {
    updateStudentDashboardStats();
});

"""

if "TASK MARKETPLACE (STUDENT)" not in td_js:
    td_js += new_td_js
    with open(td_js_path, "w", encoding="utf-8") as f:
        f.write(td_js)

print("JS modifications applied.")
