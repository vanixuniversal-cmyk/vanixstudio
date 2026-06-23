import os

target_dir = r"c:\xampp\htdocs\vanixstudio"

js_path = os.path.join(target_dir, "js", "pages", "training-tasks.src.js")

js_content = """
// Mock Data Store
const store = {
    role: 'admin', // 'admin' or 'student'
    currentUser: {
        id: 's1', name: 'John Doe', role: 'student', points: 1250, completedTasks: 12, successRate: 95, badge: '🥇 Top Performer'
    },
    tasks: [
        {
            id: 't1', title: 'Design Landing Page for VFX Course', desc: 'Create a modern landing page design for our new VFX course. Must include dark mode.', 
            category: 'Design', diff: 'Intermediate', deadline: '2026-06-30', delivery: 5, budget: 3000, priority: 'High', 
            skills: ['Figma', 'UI/UX'], status: 'Open', createdBy: 'Admin', assignedTo: null, bids: 3
        },
        {
            id: 't2', title: 'Build React Component for Video Player', desc: 'Build a custom video player component with timeline markers.', 
            category: 'Frontend', diff: 'Advanced', deadline: '2026-06-28', delivery: 3, budget: 5000, priority: 'High', 
            skills: ['React', 'CSS'], status: 'Assigned', createdBy: 'Admin', assignedTo: 's1', bids: 5
        },
        {
            id: 't3', title: 'Create 3D Animation Walk cycle', desc: 'Rig and animate a 3D character walk cycle.', 
            category: 'VFX', diff: 'Beginner', deadline: '2026-07-05', delivery: 7, budget: 2000, priority: 'Medium', 
            skills: ['Blender', 'Animation'], status: 'Submitted', createdBy: 'Admin', assignedTo: 's2', bids: 2
        },
        {
            id: 't4', title: 'Write API endpoint for User Auth', desc: 'Node.js express endpoint for JWT authentication.', 
            category: 'Backend', diff: 'Intermediate', deadline: '2026-06-25', delivery: 2, budget: 1500, priority: 'Medium', 
            skills: ['Node.js', 'Express', 'JWT'], status: 'Completed', createdBy: 'Admin', assignedTo: 's1', bids: 4
        }
    ],
    bids: [
        { id: 'b1', taskId: 't1', studentId: 's1', studentName: 'John Doe', avatar: 'https://ui-avatars.com/api/?name=John+Doe', amount: 2800, days: 4, proposal: 'I have 2 years of UI/UX experience and can deliver quickly.' },
        { id: 'b2', taskId: 't1', studentId: 's3', studentName: 'Alice Smith', avatar: 'https://ui-avatars.com/api/?name=Alice+Smith', amount: 3000, days: 5, proposal: 'I love designing landing pages!' }
    ],
    leaderboard: [
        { id: 's1', name: 'John Doe', avatar: 'https://ui-avatars.com/api/?name=John+Doe', badge: '🥇 Top Performer', completedTasks: 12, successRate: 95, points: 1250 },
        { id: 's2', name: 'Bob Ray', avatar: 'https://ui-avatars.com/api/?name=Bob+Ray', badge: '🥈 Skilled Contributor', completedTasks: 8, successRate: 90, points: 850 },
        { id: 's3', name: 'Alice Smith', avatar: 'https://ui-avatars.com/api/?name=Alice+Smith', badge: '🥉 Rising Talent', completedTasks: 5, successRate: 100, points: 550 },
        { id: 's4', name: 'Emma Watson', avatar: 'https://ui-avatars.com/api/?name=Emma+Watson', badge: '🏆 Elite Freelancer', completedTasks: 25, successRate: 98, points: 3400 }
    ],
    currentTaskDetailId: null
};

// Main App Controller
const app = {
    init() {
        this.bindEvents();
        this.setRole(store.role);
        
        // Theme init
        const isDark = localStorage.getItem('theme') !== 'light';
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    },

    bindEvents() {
        document.getElementById('themeToggle').addEventListener('click', () => {
            const el = document.documentElement;
            const newTheme = el.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            el.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });

        document.getElementById('roleSwitcher').addEventListener('change', (e) => {
            this.setRole(e.target.value);
        });
        
        // Tab routing inside my tasks
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderStudentMyTasks(e.target.dataset.tab);
            });
        });
    },

    setRole(role) {
        store.role = role;
        const isAdmin = role === 'admin';
        
        // Update profile widget
        document.getElementById('currentUserAvatar').src = isAdmin ? 'https://ui-avatars.com/api/?name=Admin+User&background=FF6B35&color=fff' : 'https://ui-avatars.com/api/?name=John+Doe&background=00B0FF&color=fff';
        document.getElementById('currentUserRoleBadge').innerText = isAdmin ? 'Admin' : 'Student';
        document.getElementById('currentUserName').innerText = isAdmin ? 'Admin Desk' : 'John Doe';
        document.getElementById('currentUserEmail').innerText = isAdmin ? 'admin@vanix.com' : 'john.d@student.vanix.com';
        
        // Toggle visibility
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
        document.querySelectorAll('.student-only').forEach(el => el.style.display = isAdmin ? 'none' : '');

        this.renderNav();
        
        if (isAdmin) {
            this.switchView('admin-dashboard');
        } else {
            this.switchView('student-browse');
        }
    },

    renderNav() {
        const nav = document.getElementById('sidebarNav');
        if (store.role === 'admin') {
            nav.innerHTML = `
                <button class="nav-item active" data-view="admin-dashboard">
                    <span>📊</span> Analytics Dashboard
                </button>
                <button class="nav-item" data-view="admin-tasks">
                    <span>📋</span> Manage Tasks
                </button>
                <button class="nav-item" data-view="leaderboard">
                    <span>🏆</span> Leaderboard
                </button>
            `;
        } else {
            nav.innerHTML = `
                <button class="nav-item active" data-view="student-browse">
                    <span>🔍</span> Browse Tasks
                </button>
                <button class="nav-item" data-view="student-mytasks">
                    <span>💼</span> My Workspace
                </button>
                <button class="nav-item" data-view="leaderboard">
                    <span>🏆</span> Leaderboard
                </button>
            `;
        }

        nav.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.nav-item');
                nav.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                target.classList.add('active');
                this.switchView(target.dataset.view);
            });
        });
    },

    switchView(viewId) {
        document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById('view-' + viewId);
        if (panel) panel.classList.add('active');

        // Update headers and logic based on view
        const titleEl = document.getElementById('pageTitle');
        const subEl = document.getElementById('pageSubtitle');
        
        if (viewId === 'admin-dashboard') {
            titleEl.innerText = 'Admin Dashboard'; subEl.innerText = 'Overview of marketplace activity';
            this.renderAdminDashboard();
        } else if (viewId === 'admin-tasks') {
            titleEl.innerText = 'Task Management'; subEl.innerText = 'Create, assign, and review tasks';
            this.renderAdminTasks();
        } else if (viewId === 'student-browse') {
            titleEl.innerText = 'Browse Tasks'; subEl.innerText = 'Find projects and submit bids';
            this.renderStudentBrowseTasks();
        } else if (viewId === 'student-mytasks') {
            titleEl.innerText = 'My Workspace'; subEl.innerText = 'Manage your assigned tasks and bids';
            this.renderStudentMyTasks('active');
        } else if (viewId === 'leaderboard') {
            titleEl.innerText = 'Leaderboard'; subEl.innerText = 'Top performing students';
            this.renderLeaderboard();
        }
    },

    // ================= ADMIN FUNCTIONS =================

    renderAdminDashboard() {
        const stats = document.getElementById('adminStatsGrid');
        stats.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon" style="background:var(--info-bg);color:var(--info)">📋</div>
                <div class="stat-info"><h3>${store.tasks.length}</h3><p>Total Tasks</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(255,107,53,0.1);color:var(--primary)">📢</div>
                <div class="stat-info"><h3>${store.tasks.filter(t=>t.status==='Open').length}</h3><p>Open for Bidding</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(156,39,176,0.1);color:#E040FB">⏳</div>
                <div class="stat-info"><h3>${store.tasks.filter(t=>t.status==='Submitted').length}</h3><p>Awaiting Review</p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:var(--success-bg);color:var(--success)">✅</div>
                <div class="stat-info"><h3>${store.tasks.filter(t=>t.status==='Completed').length}</h3><p>Completed Tasks</p></div>
            </div>
        `;
        
        const timeline = document.getElementById('adminActivityTimeline');
        timeline.innerHTML = `
            <div class="timeline-item"><div class="tl-icon"></div><div class="tl-content"><div class="tl-title">New bid submitted by Alice Smith on "Design Landing Page"</div><div class="tl-time">2 hours ago</div></div></div>
            <div class="timeline-item"><div class="tl-icon"></div><div class="tl-content"><div class="tl-title">Task "Build React Component" assigned to John Doe</div><div class="tl-time">5 hours ago</div></div></div>
            <div class="timeline-item"><div class="tl-icon"></div><div class="tl-content"><div class="tl-title">Task "Write API endpoint" completed</div><div class="tl-time">1 day ago</div></div></div>
        `;
        
        const lb = document.getElementById('adminMiniLeaderboard');
        lb.innerHTML = store.leaderboard.slice(0,3).map((s, i) => `
            <div class="flex-between border-t pt-4 mt-4 ${i===0?'border-t-0 pt-0 mt-0':''}">
                <div class="flex-align-center gap-2">
                    <img src="${s.avatar}" style="width:32px;height:32px;border-radius:50%">
                    <div><p class="font-bold text-sm">${s.name}</p><p class="text-xs text-dim">${s.completedTasks} tasks</p></div>
                </div>
                <div class="text-primary font-bold">${s.points} pts</div>
            </div>
        `).join('');
    },

    renderAdminTasks() {
        const tbody = document.getElementById('adminTasksTableBody');
        tbody.innerHTML = store.tasks.map(t => `
            <tr>
                <td>
                    <span class="task-title-cell" onclick="app.viewAdminTaskDetail('${t.id}')">${t.title}</span>
                    <span class="task-meta-cell">ID: #${t.id} • ${t.diff}</span>
                </td>
                <td><span class="skill-badge">${t.category}</span></td>
                <td><span class="badge-status status-${t.status.toLowerCase()}">${t.status}</span></td>
                <td class="font-bold">${t.bids} Bids</td>
                <td>${t.deadline}</td>
                <td><a href="#" class="link-btn" onclick="app.viewAdminTaskDetail('${t.id}')">Manage</a></td>
            </tr>
        `).join('');
    },

    viewAdminTaskDetail(id) {
        const task = store.tasks.find(t => t.id === id);
        if(!task) return;
        store.currentTaskDetailId = id;
        
        document.getElementById('detailTitle').innerText = task.title;
        document.getElementById('detailDesc').innerText = task.desc;
        document.getElementById('detailStatus').innerText = task.status;
        document.getElementById('detailStatus').className = `badge-status status-${task.status.toLowerCase()}`;
        document.getElementById('detailPriority').innerText = task.priority;
        document.getElementById('detailBudget').innerText = task.budget ? `₹${task.budget}` : 'No Budget';
        document.getElementById('detailSkills').innerHTML = task.skills.map(s => `<span class="skill-badge">${s}</span>`).join('');

        const bidsSec = document.getElementById('bidsSection');
        const subSec = document.getElementById('submissionSection');
        
        bidsSec.style.display = 'none';
        subSec.style.display = 'none';

        if(task.status === 'Open') {
            bidsSec.style.display = 'block';
            const bids = store.bids.filter(b => b.taskId === id);
            document.getElementById('bidsCount').innerText = bids.length;
            document.getElementById('bidsGrid').innerHTML = bids.map(b => `
                <div class="bid-card">
                    <div class="bid-header">
                        <div class="bid-student">
                            <img src="${b.avatar}" class="avatar-sm">
                            <div><div class="student-name">${b.studentName}</div><div class="student-meta">Success Rate: 95%</div></div>
                        </div>
                        <div>
                            <div class="bid-amount">₹${b.amount}</div>
                            <div class="bid-days">${b.days} Days</div>
                        </div>
                    </div>
                    <div class="bid-proposal">${b.proposal}</div>
                    <button class="primary-btn w-full" onclick="app.assignTask('${id}', '${b.studentId}')">Assign to ${b.studentName}</button>
                </div>
            `).join('') || '<p class="text-dim">No bids yet.</p>';
        } else {
            subSec.style.display = 'block';
            document.getElementById('assignedName').innerText = store.leaderboard.find(l=>l.id===task.assignedTo)?.name || 'Student';
            document.getElementById('assignedAvatar').src = store.leaderboard.find(l=>l.id===task.assignedTo)?.avatar || '';
            document.getElementById('assignedDate').innerText = 'recently';
            
            if(task.status === 'Submitted') {
                document.getElementById('workSubmissionBox').style.display = 'block';
                document.getElementById('waitingSubmissionBox').style.display = 'none';
            } else if (task.status === 'Completed') {
                document.getElementById('workSubmissionBox').style.display = 'none';
                document.getElementById('waitingSubmissionBox').style.display = 'block';
                document.getElementById('waitingSubmissionBox').innerText = 'Task Completed & Approved!';
                document.getElementById('waitingSubmissionBox').className = "p-6 text-center text-success bg-darker rounded-md mt-4 border border-success";
            } else {
                document.getElementById('workSubmissionBox').style.display = 'none';
                document.getElementById('waitingSubmissionBox').style.display = 'block';
                document.getElementById('waitingSubmissionBox').innerText = 'Waiting for student to submit work...';
                document.getElementById('waitingSubmissionBox').className = "p-6 text-center text-dim bg-darker rounded-md mt-4";
            }
        }
        
        this.switchView('admin-task-detail');
    },

    assignTask(taskId, studentId) {
        const task = store.tasks.find(t => t.id === taskId);
        task.status = 'Assigned';
        task.assignedTo = studentId;
        this.showToast('Task Assigned successfully!', 'success');
        this.viewAdminTaskDetail(taskId);
    },

    approveSubmission() {
        const task = store.tasks.find(t => t.id === store.currentTaskDetailId);
        task.status = 'Completed';
        this.showToast('Submission Approved! Points awarded.', 'success');
        this.viewAdminTaskDetail(task.id);
    },

    requestRevision() {
        const task = store.tasks.find(t => t.id === store.currentTaskDetailId);
        task.status = 'Assigned'; // Moves back to assigned
        this.showToast('Revision requested. Student notified.', 'error');
        this.viewAdminTaskDetail(task.id);
    },

    // ================= STUDENT FUNCTIONS =================
    
    renderStudentBrowseTasks() {
        const grid = document.getElementById('studentTasksGrid');
        const openTasks = store.tasks.filter(t => t.status === 'Open');
        
        grid.innerHTML = openTasks.map(t => `
            <div class="task-card" onclick="app.viewStudentTaskDetail('${t.id}')">
                <div class="task-card-header">
                    <span class="skill-badge">${t.category}</span>
                    <span class="badge-priority priority-${t.priority.toLowerCase()}">${t.priority}</span>
                </div>
                <h3>${t.title}</h3>
                <p>${t.desc}</p>
                <div class="task-card-footer">
                    <div>
                        <div class="text-xs text-dim uppercase">Budget</div>
                        <div class="font-bold text-primary">₹${t.budget || 0}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-dim uppercase">Deadline</div>
                        <div class="font-bold">${t.deadline}</div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    viewStudentTaskDetail(id) {
        const task = store.tasks.find(t => t.id === id);
        if(!task) return;
        store.currentTaskDetailId = id;
        
        document.getElementById('stuDetailTitle').innerText = task.title;
        document.getElementById('stuDetailDesc').innerText = task.desc;
        document.getElementById('stuDetailStatus').innerText = task.status;
        document.getElementById('stuDetailStatus').className = `badge-status status-${task.status.toLowerCase()}`;
        document.getElementById('stuDetailPriority').innerText = task.priority;
        document.getElementById('stuDetailDiff').innerText = task.diff;
        document.getElementById('stuDetailBudget').innerText = task.budget ? `₹${task.budget}` : 'No Budget';
        document.getElementById('stuDetailDeadline').innerText = task.deadline;
        document.getElementById('stuDetailSkills').innerHTML = task.skills.map(s => `<span class="skill-badge">${s}</span>`).join('');

        // Action sidebar state
        const s1 = document.getElementById('actionCanBid');
        const s2 = document.getElementById('actionBidded');
        const s3 = document.getElementById('actionAssigned');
        const s4 = document.getElementById('actionSubmitted');
        
        s1.style.display = 'none'; s2.style.display = 'none'; s3.style.display = 'none'; s4.style.display = 'none';

        if(task.assignedTo === store.currentUser.id) {
            if(task.status === 'Assigned') s3.style.display = 'block';
            else if(task.status === 'Submitted' || task.status === 'Completed') s4.style.display = 'block';
        } else if (task.status === 'Open') {
            const myBid = store.bids.find(b => b.taskId === id && b.studentId === store.currentUser.id);
            if(myBid) {
                s2.style.display = 'block';
                document.getElementById('myBidAmount').innerText = `₹${myBid.amount}`;
                document.getElementById('myBidTime').innerText = `${myBid.days} Days`;
            } else {
                s1.style.display = 'block';
            }
        }
        
        this.switchView('student-task-detail');
    },

    renderStudentMyTasks(filterTab) {
        const tbody = document.getElementById('studentMyTasksTable');
        
        let filteredTasks = [];
        if(filterTab === 'active') {
            filteredTasks = store.tasks.filter(t => t.assignedTo === store.currentUser.id && (t.status === 'Assigned' || t.status === 'Submitted'));
        } else if(filterTab === 'pending') {
            const myBidTaskIds = store.bids.filter(b => b.studentId === store.currentUser.id).map(b=>b.taskId);
            filteredTasks = store.tasks.filter(t => t.status === 'Open' && myBidTaskIds.includes(t.id));
        } else if(filterTab === 'completed') {
            filteredTasks = store.tasks.filter(t => t.assignedTo === store.currentUser.id && t.status === 'Completed');
        }

        tbody.innerHTML = filteredTasks.map(t => {
            const isBidded = filterTab === 'pending';
            const role = isBidded ? 'Bidder' : 'Assignee';
            return `
            <tr>
                <td>
                    <span class="task-title-cell" onclick="app.viewStudentTaskDetail('${t.id}')">${t.title}</span>
                </td>
                <td>
                    <div class="mb-1">${role}</div>
                    <span class="badge-status status-${t.status.toLowerCase()}">${t.status}</span>
                </td>
                <td>${t.deadline}</td>
                <td class="font-bold text-primary">₹${t.budget || 0}</td>
                <td><a href="#" class="link-btn" onclick="app.viewStudentTaskDetail('${t.id}')">View</a></td>
            </tr>
        `}).join('') || '<tr><td colspan="5" class="text-center text-dim p-6">No tasks found in this category.</td></tr>';
    },

    // ================= LEADERBOARD =================
    
    renderLeaderboard() {
        const sorted = [...store.leaderboard].sort((a,b) => b.points - a.points);
        
        const podium = document.getElementById('leaderboardPodium');
        podium.innerHTML = '';
        if(sorted[1]) podium.innerHTML += this.getPodiumHtml(sorted[1], 2);
        if(sorted[0]) podium.innerHTML += this.getPodiumHtml(sorted[0], 1);
        if(sorted[2]) podium.innerHTML += this.getPodiumHtml(sorted[2], 3);

        const tbody = document.getElementById('leaderboardTable');
        tbody.innerHTML = sorted.map((s, i) => `
            <tr>
                <td class="font-bold text-dim">#${i+1}</td>
                <td>
                    <div class="flex-align-center gap-2">
                        <img src="${s.avatar}" style="width:32px;height:32px;border-radius:50%">
                        <span class="font-bold">${s.name}</span>
                    </div>
                </td>
                <td>${s.badge}</td>
                <td class="text-center">${s.completedTasks}</td>
                <td class="text-center text-success">${s.successRate}%</td>
                <td class="font-bold text-primary">⭐ ${s.points}</td>
            </tr>
        `).join('');
    },
    
    getPodiumHtml(s, rank) {
        return `
        <div class="podium-item rank-${rank}">
            <div class="podium-rank">${rank}</div>
            <img src="${s.avatar}" class="podium-avatar">
            <div class="podium-bar">
                <div class="podium-name">${s.name}</div>
                <div class="podium-pts">${s.points} pts</div>
            </div>
        </div>`;
    },

    // ================= MODALS & FORMS =================
    
    showModal(id) { document.getElementById(id).classList.add('active'); },
    closeModal(id) { document.getElementById(id).classList.remove('active'); },
    
    showCreateTaskModal() { this.showModal('createTaskModal'); },
    
    submitCreateTask() {
        const title = document.getElementById('ct_title').value;
        if(!title) return this.showToast('Title is required', 'error');
        
        store.tasks.unshift({
            id: 't' + Date.now(),
            title: title,
            desc: document.getElementById('ct_desc').value,
            category: document.getElementById('ct_category').value,
            diff: document.getElementById('ct_difficulty').value,
            deadline: document.getElementById('ct_deadline').value,
            delivery: document.getElementById('ct_delivery').value,
            budget: document.getElementById('ct_budget').value,
            priority: document.getElementById('ct_priority').value,
            skills: document.getElementById('ct_skills').value.split(','),
            status: 'Open', createdBy: 'Admin', assignedTo: null, bids: 0
        });
        
        this.closeModal('createTaskModal');
        document.getElementById('createTaskForm').reset();
        this.showToast('Task posted successfully!', 'success');
        this.switchView('admin-tasks');
    },

    showBidModal() { this.showModal('submitBidModal'); },
    
    submitBid() {
        const amount = document.getElementById('bid_amount').value;
        if(!amount) return this.showToast('Amount required', 'error');
        
        store.bids.push({
            id: 'b' + Date.now(),
            taskId: store.currentTaskDetailId,
            studentId: store.currentUser.id,
            studentName: store.currentUser.name,
            avatar: 'https://ui-avatars.com/api/?name=John+Doe',
            amount: amount,
            days: document.getElementById('bid_days').value,
            proposal: document.getElementById('bid_proposal').value
        });
        
        const task = store.tasks.find(t=>t.id === store.currentTaskDetailId);
        task.bids++;
        
        this.closeModal('submitBidModal');
        document.getElementById('bidForm').reset();
        this.showToast('Bid submitted successfully!', 'success');
        this.viewStudentTaskDetail(store.currentTaskDetailId);
    },

    cancelBid() {
        store.bids = store.bids.filter(b => !(b.taskId === store.currentTaskDetailId && b.studentId === store.currentUser.id));
        const task = store.tasks.find(t=>t.id === store.currentTaskDetailId);
        task.bids--;
        this.showToast('Bid withdrawn', 'success');
        this.viewStudentTaskDetail(store.currentTaskDetailId);
    },

    showSubmitWorkModal() { this.showModal('submitWorkModal'); },
    
    submitWork() {
        const task = store.tasks.find(t => t.id === store.currentTaskDetailId);
        task.status = 'Submitted';
        this.closeModal('submitWorkModal');
        this.showToast('Work submitted for review!', 'success');
        this.viewStudentTaskDetail(task.id);
    },

    showToast(msg, type='info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${type==='success'?'✅':type==='error'?'⚠️':'ℹ️'}</span> <div>${msg}</div>`;
        document.getElementById('toastContainer').appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
"""

with open(js_path, "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"Created {js_path}")

