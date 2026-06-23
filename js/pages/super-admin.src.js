// ══════════════════════════════════════════════════════
// SUPER ADMIN JS — VANIX STUDIO
// ══════════════════════════════════════════════════════
// API base set by js/api-config.js — auto-detects dev vs production
const API = window.API_BASE || '';
let token = null;
let currentSection = 'overview';
let pendingLeaveId = null;
let hubInterval = null;
let shouldScrollToBottom = true;

// ── Boot ──────────────────────────────────────────────
window.addEventListener('load', async () => {
    // Apply theme on load
    const savedTheme = localStorage.getItem('vanix-theme') || 'crimson';
    document.body.classList.remove('theme-crimson', 'theme-cyan', 'theme-purple');
    document.body.classList.add(`theme-${savedTheme}`);

    // Sync session from localStorage to sessionStorage if needed
    const activeSessionStr = localStorage.getItem('vanix_active_session');
    if (activeSessionStr) {
        try {
            const activeSession = JSON.parse(activeSessionStr);
            if (activeSession && activeSession.role === 'super_admin' && activeSession.token) {
                sessionStorage.setItem('sa_token', activeSession.token);
                sessionStorage.setItem('sa_email', activeSession.email || '');
            }
        } catch (e) {
            console.error('Failed to sync session from localStorage', e);
        }
    }

    await animateLoader();
    token = sessionStorage.getItem('sa_token');
    if (!token) {
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section');
        const query = section === 'developer' ? '?redirect=developer' : '';
        window.location.href = '../pages/employee-login.html' + query;
        return;
    }
    document.getElementById('saLayout').classList.add('visible');
    startClock();
    initParticles();
    
    // Support deep-linking to specific section (e.g., ?section=developer)
    const urlParams = new URLSearchParams(window.location.search);
    const initialSection = urlParams.get('section');
    
    await loadOverview();
    
    // Double click sidebar brand handler for secret developer portal access
    const sidebarBrand = document.getElementById('sidebarBrand');
    if (sidebarBrand) {
        let clicks = 0;
        let timer = null;
        let promptActive = false;

        const triggerDeveloperPrompt = () => {
            if (promptActive) return;
            promptActive = true;
            
            // Prompt password
            const password = prompt("Enter Developer clearance key:");
            promptActive = false;
            
            if (password === "vanixdev") {
                sessionStorage.setItem('developer_authorized', 'true');
                showToast('Developer Access Granted. Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '../developer.html';
                }, 1000);
            } else if (password !== null) {
                showToast('Access Denied: Incorrect Clearance Key.', 'error');
            }
        };

        // Support native dblclick
        sidebarBrand.addEventListener('dblclick', (e) => {
            e.preventDefault();
            triggerDeveloperPrompt();
        });

        // Support simulated double click
        sidebarBrand.addEventListener('click', () => {
            clicks++;
            if (clicks === 1) {
                timer = setTimeout(() => {
                    clicks = 0;
                }, 500); // 500ms double click threshold
            } else if (clicks === 2) {
                clearTimeout(timer);
                clicks = 0;
                triggerDeveloperPrompt();
            }
        });
    }

    if (initialSection) {
        // Handle initial developer section loading under password check
        if (initialSection === 'developer') {
            const password = prompt("Enter Developer clearance key to load portal:");
            if (password === "vanixdev") {
                sessionStorage.setItem('developer_authorized', 'true');
                showToast('Developer Access Granted. Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '../developer.html';
                }, 1000);
            } else {
                showToast('Access Denied.', 'error');
                showSection('overview');
            }
        } else {
            showSection(initialSection);
        }
    }
});

async function animateLoader() {
    const fill = document.getElementById('loaderFill');
    const status = document.getElementById('loaderStatus');
    const steps = ['VERIFYING TOKEN...', 'DECRYPTING CLEARANCE...', 'INITIALIZING CORE...', 'ACCESS GRANTED'];
    let pct = 0;
    return new Promise(resolve => {
        const interval = setInterval(() => {
            pct += Math.random() * 25;
            if (pct >= 100) { pct = 100; clearInterval(interval); }
            fill.style.width = pct + '%';
            const stepIndex = Math.min(Math.floor(pct / 25), 3);
            let stepText = '';
            if (stepIndex === 0) stepText = steps[0];
            else if (stepIndex === 1) stepText = steps[1];
            else if (stepIndex === 2) stepText = steps[2];
            else if (stepIndex === 3) stepText = steps[3];
            status.textContent = stepText;
            if (pct >= 100) setTimeout(() => { document.getElementById('loader').classList.add('hidden'); resolve(); }, 400);
        }, 180);
    });
}

// ── Clock ─────────────────────────────────────────────
function startClock() {
    function tick() {
        document.getElementById('headerTime').textContent =
            new Date().toLocaleTimeString('en-US', { hour12: false });
    }
    tick(); setInterval(tick, 1000);
}

// ── Particles ─────────────────────────────────────────
function initParticles() {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const dots = Array.from({length: 40}, () => ({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5, o: Math.random() * 0.3 + 0.05
    }));
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        dots.forEach(d => {
            d.x += d.vx; d.y += d.vy;
            if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
            if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
            ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,0,0,${d.o})`; ctx.fill();
        });
        requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
}

// ── Section Navigation ────────────────────────────────
function showSection(name) {
    const validSections = ['overview', 'create-employee', 'manage-employees', 'manage-users', 'contact-messages', 'employee-logins', 'user-logins', 'site-visitors', 'hub', 'leaves', 'training'];
    if (!validSections.includes(name)) return;

    currentSection = name;
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(`section-${name}`).classList.add('active');
    document.querySelector(`[data-section="${name}"]`).classList.add('active');
    
    let t = 'DASHBOARD';
    let s = '';
    if (name === 'overview') {
        t = 'SYSTEM OVERVIEW'; s = 'Full system intelligence & command center';
    } else if (name === 'hub') {
        t = 'STUDIO HUB'; s = 'Real-time communication & bulletins center';
    } else if (name === 'create-employee') {
        t = 'CREATE STAFF'; s = 'Onboard new team members to the system';
    } else if (name === 'manage-employees') {
        t = 'MANAGE STAFF'; s = 'Browse and manage all employee accounts';
    } else if (name === 'manage-users') {
        t = 'USER REGISTRATIONS'; s = 'Track and manage user registrations';
    } else if (name === 'contact-messages') {
        t = 'CONTACT MESSAGES'; s = 'Inquiries submitted by prospective clients';
    } else if (name === 'employee-logins') {
        t = 'EMPLOYEE LOGINS'; s = 'Real-time employee login and activity logs';
    } else if (name === 'user-logins') {
        t = 'USER LOGINS'; s = 'Real-time public user login and activity logs';
    } else if (name === 'site-visitors') {
        t = 'SITE VISITOR ANALYTICS'; s = 'All site visits — page, IP address, referrer & time spent';
    } else if (name === 'leaves') {
        t = 'LEAVE PORTAL'; s = 'Review, approve, or reject employee leave requests';
    } else if (name === 'training') {
        t = 'TRAINING PORTAL'; s = 'Manage student credentials and recorded class curriculum';
    }
    
    document.getElementById('pageTitle').textContent = t;
    document.getElementById('pageSubtitle').textContent = s;

    // Manage section specific loads and polling
    if (name === 'hub') {
        shouldScrollToBottom = true;
        loadChat();
        loadBulletins();
        startHubPolling();
    } else {
        stopHubPolling();
    }

    if (name === 'manage-users') loadUsers();
    if (name === 'manage-employees') loadEmployees();
    if (name === 'contact-messages') loadContactMessages();
    if (name === 'employee-logins') loadEmployeeLogins();
    if (name === 'user-logins') loadUserLogins();
    if (name === 'site-visitors') loadSiteVisitors();
    if (name === 'leaves') loadLeaves();
    if (name === 'training') {
        loadTrainingStudents();
        loadRecordingClasses();
        loadTrainingTasks();
        loadTrainersProgress();
    }
    if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
}

// ── API Helper ────────────────────────────────────────
async function api(path, opts = {}) {
    const resp = await fetch(`${API}${path}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
        ...opts
    });
    if (resp.status === 401) { logout(); return null; }
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.detail || 'Request failed'); }
    return resp.json();
}

// ── Overview ──────────────────────────────────────────
async function loadOverview() {
    try {
        const stats = await api('/api/super-admin/stats');
        const logs = await api('/api/super-admin/recent-logins?limit=10');
        if (!stats) return;

        document.getElementById('statUsers').textContent = stats.total_users;
        document.getElementById('statEmployees').textContent = stats.total_employees;
        document.getElementById('statLogins').textContent = stats.logins_today;
        document.getElementById('statLeaves').textContent = stats.pending_leaves;
        document.getElementById('statVisits').textContent = stats.site_visits_today;
        document.getElementById('statMessages').textContent = stats.total_messages;

        if (logs) {
            document.getElementById('activityCount').textContent = `${logs.length} entries`;
            renderLogTable(logs, 'overviewLogBody', ['actor_name','role','login_at','logout_at','ip_address']);
        }
    } catch (e) { showToast('Failed to load stats: ' + e.message, 'error'); }
}

function renderLogTable(logs, tbodyId, cols) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    if (!logs.length) {
        tbody.innerHTML = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = cols.length;
        td.className = 'empty-row';
        td.textContent = 'No records found';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }
    tbody.innerHTML = '';
    logs.forEach(l => {
        const tr = document.createElement('tr');
        
        const tdActor = document.createElement('td');
        tdActor.textContent = l.actor_name || '—';
        tr.appendChild(tdActor);
        
        const tdRole = document.createElement('td');
        const spanRole = document.createElement('span');
        spanRole.className = `role-badge role-${l.role}`;
        spanRole.textContent = (l.role || '').toUpperCase();
        tdRole.appendChild(spanRole);
        tr.appendChild(tdRole);
        
        const tdLogin = document.createElement('td');
        tdLogin.textContent = fmtTime(l.login_at);
        tr.appendChild(tdLogin);
        
        const tdLogout = document.createElement('td');
        if (l.logout_at) {
            tdLogout.textContent = fmtTime(l.logout_at);
        } else {
            const span = document.createElement('span');
            span.style.color = 'rgba(255,255,255,0.2)';
            span.textContent = '—';
            tdLogout.appendChild(span);
        }
        tr.appendChild(tdLogout);
        
        const tdIp = document.createElement('td');
        tdIp.textContent = l.ip_address || '—';
        tr.appendChild(tdIp);
        
        tbody.appendChild(tr);
    });
}

// ── Users Table ───────────────────────────────────────
async function loadUsers() {
    try {
        const users = await api('/api/super-admin/users');
        const tbody = document.getElementById('userTableBody');
        if (!tbody) return;
        if (!users || !users.length) {
            tbody.innerHTML = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;
            td.className = 'empty-row';
            td.textContent = 'No users registered';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        tbody.innerHTML = '';
        users.forEach(u => {
            const tr = document.createElement('tr');
            
            const tdId = document.createElement('td');
            tdId.textContent = u.id;
            tr.appendChild(tdId);
            
            const tdName = document.createElement('td');
            tdName.textContent = u.name;
            tr.appendChild(tdName);
            
            const tdEmail = document.createElement('td');
            tdEmail.textContent = u.email;
            tr.appendChild(tdEmail);
            
            const tdPhone = document.createElement('td');
            tdPhone.textContent = u.phone || '—';
            tr.appendChild(tdPhone);
            
            const tdInterests = document.createElement('td');
            if (u.interests) {
                u.interests.split(',').forEach(i => {
                    const span = document.createElement('span');
                    span.className = 'role-badge role-user';
                    span.textContent = i.trim().toUpperCase();
                    tdInterests.appendChild(span);
                    tdInterests.appendChild(document.createTextNode(' '));
                });
            } else {
                tdInterests.textContent = '—';
            }
            tr.appendChild(tdInterests);
            
            const tdDate = document.createElement('td');
            tdDate.textContent = fmtDate(u.created_at);
            tr.appendChild(tdDate);
            
            tbody.appendChild(tr);
        });
    } catch (e) { showToast(e.message, 'error'); }
}

async function exportUsersCSV() {
    try {
        const resp = await fetch(`${API}/api/super-admin/users/export-csv`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.status === 401) { logout(); return; }
        if (!resp.ok) throw new Error('Failed to export CSV');
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users_export.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('CSV downloaded successfully!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
}

async function exportEmployeesCSV() {
    try {
        const resp = await fetch(`${API}/api/super-admin/employees/export-csv`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.status === 401) { logout(); return; }
        if (!resp.ok) throw new Error('Failed to export CSV');
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'employees_export.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('Employees CSV downloaded successfully!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
}

async function exportEmployeeActivity() {
    try {
        const resp = await fetch(`${API}/api/super-admin/employee-activities/export-csv`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.status === 401) { logout(); return; }
        if (!resp.ok) throw new Error('Failed to export CSV');
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employee_activity_export_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('CSV downloaded successfully!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
}

let isMaintenance = false;
function toggleMaintenance() {
    isMaintenance = !isMaintenance;
    const btn = document.getElementById('maintBtn');
    btn.textContent = isMaintenance ? 'ENABLED' : 'DISABLED';
    btn.style.color = isMaintenance ? 'var(--red)' : '';
    showToast(isMaintenance ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.', 'success');
}

let isDebugLogs = true;
function toggleDebugLogs() {
    isDebugLogs = !isDebugLogs;
    const btn = document.getElementById('debugBtn');
    btn.textContent = isDebugLogs ? 'ENABLED' : 'DISABLED';
    btn.style.color = !isDebugLogs ? 'var(--text-dim)' : '';
    showToast(isDebugLogs ? 'API debug logs enabled.' : 'API debug logs disabled.', 'success');
}

// ── Employees Table ───────────────────────────────────
async function loadEmployees() {
    try {
        const emps = await api('/api/super-admin/employees');
        const tbody = document.getElementById('empTableBody');
        if (!tbody) return;
        if (!emps || !emps.length) {
            tbody.innerHTML = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 11;
            td.className = 'empty-row';
            td.textContent = 'No employees found';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        tbody.innerHTML = '';
        emps.forEach(e => {
            const tr = document.createElement('tr');
            
            const tdId = document.createElement('td');
            tdId.textContent = e.id;
            tr.appendChild(tdId);
            
            const tdCompanyId = document.createElement('td');
            tdCompanyId.style.fontFamily = 'monospace';
            tdCompanyId.style.color = 'var(--red)';
            tdCompanyId.style.fontWeight = '700';
            tdCompanyId.textContent = e.company_id || '—';
            tr.appendChild(tdCompanyId);
            
            const tdName = document.createElement('td');
            tdName.textContent = e.name;
            tr.appendChild(tdName);
            
            const tdEmail = document.createElement('td');
            tdEmail.textContent = e.email;
            tr.appendChild(tdEmail);

            const tdPass = document.createElement('td');
            tdPass.style.fontFamily = 'monospace';
            tdPass.style.color = '#ffd700'; // gold color
            tdPass.textContent = e.plain_password || '—';
            tr.appendChild(tdPass);
            
            const tdDept = document.createElement('td');
            tdDept.textContent = e.department;
            tr.appendChild(tdDept);
            
            const tdInvite = document.createElement('td');
            tdInvite.style.fontFamily = 'monospace';
            tdInvite.style.color = 'var(--primary)';
            tdInvite.textContent = e.invite_code || '—';
            tr.appendChild(tdInvite);

            const tdLogins = document.createElement('td');
            tdLogins.textContent = e.login_count > 0 ? `${e.login_count} logins` : '0 logins';
            tr.appendChild(tdLogins);
            
            const tdStatus = document.createElement('td');
            const spanStatus = document.createElement('span');
            spanStatus.className = `status-badge ${e.is_active ? 'status-active' : 'status-inactive'}`;
            spanStatus.textContent = e.is_active ? 'ACTIVE' : 'INACTIVE';
            tdStatus.appendChild(spanStatus);
            tr.appendChild(tdStatus);
            
            const tdDate = document.createElement('td');
            tdDate.textContent = fmtDate(e.created_at);
            tr.appendChild(tdDate);
            
            const tdActions = document.createElement('td');
            
            const btnToggle = document.createElement('button');
            btnToggle.className = 'action-btn';
            btnToggle.style.background = e.is_active ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#00cc64,#008b45)';
            btnToggle.style.color = '#fff';
            btnToggle.style.border = 'none';
            btnToggle.style.marginRight = '5px';
            btnToggle.style.padding = '5px 8px';
            btnToggle.style.fontSize = '9px';
            btnToggle.textContent = e.is_active ? 'DEACTIVATE' : 'ACTIVATE';
            btnToggle.addEventListener('click', () => toggleEmployeeStatus(e.id));
            tdActions.appendChild(btnToggle);
            
            const btnDelete = document.createElement('button');
            btnDelete.className = 'action-btn delete-btn';
            btnDelete.style.padding = '5px 8px';
            btnDelete.style.fontSize = '9px';
            btnDelete.textContent = 'DELETE';
            btnDelete.addEventListener('click', () => deleteEmployee(e.id));
            tdActions.appendChild(btnDelete);
            
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    } catch (e) { showToast(e.message, 'error'); }
}

async function toggleEmployeeStatus(id) {
    try {
        const res = await api(`/api/super-admin/employees/${id}/toggle-status`, { method: 'POST' });
        if (res) {
            showToast(`Employee status updated to ${res.is_active ? 'ACTIVE' : 'INACTIVE'}`, 'success');
            await loadEmployees();
            await loadOverview();
        }
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this employee account? This action is permanent and will delete their attendance, leave records, and login logs.')) return;
    try {
        await api(`/api/super-admin/employees/${id}`, { method: 'DELETE' });
        showToast('Employee deleted successfully', 'success');
        await loadEmployees();
        await loadOverview();
    } catch (e) { showToast(e.message, 'error'); }
}

// ── Employee and User Logins ──────────────────────────
async function loadEmployeeLogins() {
    try {
        const logs = await api('/api/super-admin/recent-logins?limit=50&role=employee');
        const tbody = document.getElementById('employeeLoginsBody');
        if (!tbody) return;
        renderGenericLoginsTable(logs, tbody);
    } catch (e) { showToast(e.message, 'error'); }
}

async function loadUserLogins() {
    try {
        const logs = await api('/api/super-admin/recent-logins?limit=50&role=user');
        const tbody = document.getElementById('userLoginsBody');
        if (!tbody) return;
        renderGenericLoginsTable(logs, tbody);
    } catch (e) { showToast(e.message, 'error'); }
}

function renderGenericLoginsTable(logs, tbody) {
    if (!logs || !logs.length) {
        tbody.innerHTML = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.className = 'empty-row';
        td.textContent = 'No logins recorded';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }
    tbody.innerHTML = '';
    logs.forEach((l, i) => {
        const tr = document.createElement('tr');
        
        const tdIndex = document.createElement('td');
        tdIndex.textContent = i + 1;
        tr.appendChild(tdIndex);
        
        const tdActor = document.createElement('td');
        tdActor.textContent = l.actor_name || '—';
        tr.appendChild(tdActor);
        
        const tdRole = document.createElement('td');
        const spanRole = document.createElement('span');
        spanRole.className = `role-badge role-${l.role}`;
        spanRole.textContent = (l.role || '').toUpperCase();
        tdRole.appendChild(spanRole);
        tr.appendChild(tdRole);
        
        const tdLogin = document.createElement('td');
        tdLogin.textContent = fmtTime(l.login_at);
        tr.appendChild(tdLogin);
        
        const tdLogout = document.createElement('td');
        tdLogout.textContent = l.logout_at ? fmtTime(l.logout_at) : '—';
        tr.appendChild(tdLogout);
        
        const tdIp = document.createElement('td');
        tdIp.textContent = l.ip_address || '—';
        tr.appendChild(tdIp);
        
        tbody.appendChild(tr);
    });
}


// ── Site Visitors Table ───────────────────────────────
async function loadSiteVisitors() {
    try {
        const visits = await api('/api/super-admin/site-visits?limit=200');
        const tbody = document.getElementById('visitorsTableBody');
        if (!tbody) return;
        if (!visits || !visits.length) {
            tbody.innerHTML = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 7;
            td.className = 'empty-row';
            td.textContent = 'No site visits recorded yet';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        tbody.innerHTML = '';
        visits.forEach((v, i) => {
            const tr = document.createElement('tr');

            // # index
            const tdIdx = document.createElement('td');
            tdIdx.textContent = i + 1;
            tr.appendChild(tdIdx);

            // Page
            const tdPage = document.createElement('td');
            tdPage.style.fontFamily = 'monospace';
            tdPage.style.color = 'var(--red)';
            tdPage.textContent = v.page || '/';
            tr.appendChild(tdPage);

            // IP Address
            const tdIp = document.createElement('td');
            tdIp.style.fontFamily = 'monospace';
            tdIp.style.fontWeight = '700';
            tdIp.textContent = v.ip_address || '—';
            tr.appendChild(tdIp);

            // Referrer
            const tdRef = document.createElement('td');
            tdRef.style.fontSize = '11px';
            tdRef.style.color = 'rgba(255,255,255,0.5)';
            tdRef.style.maxWidth = '180px';
            tdRef.style.overflow = 'hidden';
            tdRef.style.textOverflow = 'ellipsis';
            tdRef.style.whiteSpace = 'nowrap';
            tdRef.title = v.referrer || '';
            tdRef.textContent = v.referrer || '—';
            tr.appendChild(tdRef);

            // Time Spent
            const tdTime = document.createElement('td');
            if (v.time_spent_seconds !== null && v.time_spent_seconds !== undefined) {
                const secs = v.time_spent_seconds;
                tdTime.textContent = secs >= 60
                    ? `${Math.floor(secs / 60)}m ${secs % 60}s`
                    : `${secs}s`;
                tdTime.style.color = secs > 60 ? '#00cc64' : 'rgba(255,255,255,0.5)';
            } else {
                tdTime.textContent = '—';
                tdTime.style.color = 'rgba(255,255,255,0.2)';
            }
            tr.appendChild(tdTime);

            // User Agent (truncated)
            const tdUa = document.createElement('td');
            tdUa.style.fontSize = '10px';
            tdUa.style.color = 'rgba(255,255,255,0.3)';
            tdUa.style.maxWidth = '200px';
            tdUa.style.overflow = 'hidden';
            tdUa.style.textOverflow = 'ellipsis';
            tdUa.style.whiteSpace = 'nowrap';
            tdUa.title = v.user_agent || '';
            // Show a simplified browser label instead of the raw UA string
            const ua = v.user_agent || '';
            let browser = 'Unknown';
            if (ua.includes('Edg/')) browser = 'Edge';
            else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
            else if (ua.includes('Chrome')) browser = 'Chrome';
            else if (ua.includes('Firefox')) browser = 'Firefox';
            else if (ua.includes('Safari')) browser = 'Safari';
            let os = '';
            if (ua.includes('Windows')) os = 'Windows';
            else if (ua.includes('Android')) os = 'Android';
            else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
            else if (ua.includes('Mac')) os = 'macOS';
            else if (ua.includes('Linux')) os = 'Linux';
            tdUa.textContent = os ? `${browser} / ${os}` : browser;
            tr.appendChild(tdUa);

            // Visited At
            const tdDate = document.createElement('td');
            tdDate.textContent = fmtTime(v.visited_at);
            tr.appendChild(tdDate);

            tbody.appendChild(tr);
        });
    } catch (e) { showToast(e.message, 'error'); }
}

async function exportVisitorsCSV() {
    try {
        const resp = await fetch(`${API}/api/super-admin/site-visits/export-csv`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.status === 401) { logout(); return; }
        if (!resp.ok) throw new Error('Failed to export CSV');
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'site_visits_export.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showToast('Site visitors CSV downloaded!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
}

// ── Contact Messages ──────────────────────────────────
async function loadContactMessages() {
    try {
        const msgs = await api('/api/super-admin/contact-messages');
        const tbody = document.getElementById('contactTableBody');
        if (!tbody) return;
        if (!msgs || !msgs.length) {
            tbody.innerHTML = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 7;
            td.className = 'empty-row';
            td.textContent = 'No messages yet';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        tbody.innerHTML = '';
        msgs.forEach(m => {
            const tr = document.createElement('tr');
            
            const tdId = document.createElement('td');
            tdId.textContent = m.id;
            tr.appendChild(tdId);
            
            const tdName = document.createElement('td');
            tdName.textContent = m.name;
            tr.appendChild(tdName);
            
            const tdEmail = document.createElement('td');
            tdEmail.textContent = m.email;
            tr.appendChild(tdEmail);
            
            const tdPhone = document.createElement('td');
            tdPhone.textContent = m.phone || '—';
            tr.appendChild(tdPhone);
            
            const tdService = document.createElement('td');
            tdService.textContent = m.service || '—';
            tr.appendChild(tdService);
            
            const tdDetails = document.createElement('td');
            tdDetails.style.fontSize = '11px';
            tdDetails.style.whiteSpace = 'pre-wrap';
            tdDetails.textContent = m.details;
            tr.appendChild(tdDetails);
            
            const tdDate = document.createElement('td');
            tdDate.textContent = fmtDate(m.created_at);
            tr.appendChild(tdDate);
            
            tbody.appendChild(tr);
        });
    } catch (e) { showToast(e.message, 'error'); }
}

// ── Admin Creation Removed ────────────────────────────

// ── Create Employee ───────────────────────────────────
async function createEmployee(e) {
    e.preventDefault();
    const btn = document.getElementById('createEmpBtn');
    btn.classList.add('loading'); btn.querySelector('span').textContent = 'GENERATING...';
    document.getElementById('empCredentials').classList.add('hidden');
    try {
        const data = await api('/api/super-admin/create-employee', {
            method: 'POST',
            body: JSON.stringify({
                name: document.getElementById('empName').value,
                email: document.getElementById('empEmail').value,
                department: document.getElementById('empDept').value,
            })
        });
        document.getElementById('credName').textContent = data.name;
        document.getElementById('credEmail').textContent = data.email;
        document.getElementById('credPassword').textContent = data.generated_password;
        document.getElementById('credInvite').textContent = data.invite_code;
        document.getElementById('empCredentials').classList.remove('hidden');
        document.getElementById('createEmployeeForm').reset();
        showToast('Employee created! Credentials emailed.', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.classList.remove('loading'); btn.querySelector('span').textContent = '⊞ CREATE EMPLOYEE';
    }
}

function copyCredentials() {
    const text = `NAME: ${document.getElementById('credName').textContent}\nEMAIL: ${document.getElementById('credEmail').textContent}\nPASSWORD: ${document.getElementById('credPassword').textContent}\nINVITE CODE: ${document.getElementById('credInvite').textContent}`;
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!', 'success'));
}

// ── Utilities ─────────────────────────────────────────
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function togglePass(id) {
    const el = document.getElementById(id);
    el.type = el.type === 'password' ? 'text' : 'password';
}
function fmtTime(iso) { if (!iso) return '—'; return new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }); }
function fmtDate(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }

function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3000);
}

// Cross-tab logout synchronization
window.addEventListener('storage', (e) => {
    if (e.key === 'vanix_active_session' && !e.newValue) {
        logout();
    }
});

function logout() {
    stopHubPolling();
    sessionStorage.removeItem('sa_token');
    sessionStorage.removeItem('sa_email');
    localStorage.removeItem('vanix_active_session');
    window.location.href = '../pages/employee-login.html';
}

// ── Studio Hub Real-time Chat & Bulletins ──────────────
function startHubPolling() {
    if (hubInterval) clearInterval(hubInterval);
    hubInterval = setInterval(() => {
        loadChat();
        loadBulletins();
    }, 3000);
}

function stopHubPolling() {
    if (hubInterval) {
        clearInterval(hubInterval);
        hubInterval = null;
    }
}

async function loadChat() {
    try {
        const messages = await api('/api/chat/messages');
        if (!messages) return;
        
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        const isNearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 60;
        
        let html = '';
        messages.forEach(msg => {
            const isOutgoing = (msg.sender_role === 'super_admin');
            const typeClass = isOutgoing ? 'message-outgoing' : 'message-incoming';
            const roleClass = msg.sender_role === 'super_admin' ? 'sa' : 'emp';
            const roleLabel = msg.sender_role === 'super_admin' ? 'SA' : 'Staff';
            
            const timeStr = new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            html += `
                <div class="chat-message-item ${typeClass} message-role-${roleClass}">
                    <div class="message-meta">
                        <span class="message-sender">${escapeHtml(msg.sender_name)} <span class="message-sender-role ${roleClass}">${roleLabel}</span></span>
                        <span class="message-time">${timeStr}</span>
                    </div>
                    <div class="message-text">${escapeHtml(msg.message)}</div>
                </div>
            `;
        });
        
        container.innerHTML = html || `<div style="text-align:center; color:var(--text-muted); font-size:11px; padding:20px;">No messages yet. Start the conversation!</div>`;
        
        if (shouldScrollToBottom || isNearBottom) {
            container.scrollTop = container.scrollHeight;
            shouldScrollToBottom = false;
        }
    } catch (e) {
        console.error('Failed to load chat messages:', e);
    }
}

async function sendChatMessage(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('chatInput');
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;
    
    input.value = '';
    try {
        await api('/api/chat/messages', {
            method: 'POST',
            body: JSON.stringify({ message })
        });
        shouldScrollToBottom = true;
        await loadChat();
    } catch (err) {
        showToast('Failed to send message: ' + err.message, 'error');
    }
}

async function loadBulletins() {
    try {
        const bulletins = await api('/api/bulletins');
        if (!bulletins) return;
        
        const container = document.getElementById('hubBulletinsList');
        if (!container) return;
        
        let html = '';
        bulletins.forEach(b => {
            const dateStr = new Date(b.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            html += `
                <div class="bulletin-card-item">
                    <div class="bulletin-card-header">
                        <h4 class="bulletin-card-title">${escapeHtml(b.title)}</h4>
                        <div class="bulletin-card-meta">
                            <span class="bulletin-badge ${b.type}">${b.type}</span>
                            <button class="bulletin-delete-btn" onclick="deleteBulletin(${b.id})" title="Delete Bulletin">🗑</button>
                        </div>
                    </div>
                    <p class="bulletin-card-text">${escapeHtml(b.content)}</p>
                    <div class="bulletin-card-date">${dateStr}</div>
                </div>
            `;
        });
        
        container.innerHTML = html || `<div style="text-align:center; color:var(--text-muted); font-size:11px; padding:20px;">No announcements posted yet.</div>`;
    } catch (e) {
        console.error('Failed to load bulletins:', e);
    }
}

async function createBulletin(e) {
    if (e) e.preventDefault();
    const titleEl = document.getElementById('bulletinTitle');
    const typeEl = document.getElementById('bulletinType');
    const contentEl = document.getElementById('bulletinContent');
    
    if (!titleEl || !contentEl) return;
    
    const title = titleEl.value.trim();
    const type = typeEl ? typeEl.value : 'info';
    const content = contentEl.value.trim();
    
    if (!title || !content) return;
    
    try {
        await api('/api/bulletins', {
            method: 'POST',
            body: JSON.stringify({ title, type, content })
        });
        
        titleEl.value = '';
        contentEl.value = '';
        showToast('✅ Bulletin announcement posted!', 'success');
        await loadBulletins();
    } catch (err) {
        showToast('Failed to post bulletin: ' + err.message, 'error');
    }
}

async function deleteBulletin(bulletinId) {
    if (!confirm('Are you sure you want to delete this bulletin announcement?')) return;
    try {
        await api(`/api/bulletins/${bulletinId}`, {
            method: 'DELETE'
        });
        showToast('Bulletin announcement deleted successfully', 'success');
        await loadBulletins();
    } catch (err) {
        showToast('Failed to delete bulletin: ' + err.message, 'error');
    }
}

let allLeavesData = []; // Store raw leaves data to allow local filtering

async function loadLeaves() {
    try {
        const data = await api('/api/super-admin/leaves');
        if (!data) return;
        allLeavesData = data;
        
        const filterVal = document.getElementById('leavesFilter') ? document.getElementById('leavesFilter').value : 'pending';
        filterLeaves(filterVal);
    } catch (e) {
        showToast('Failed to load leave requests: ' + e.message, 'error');
    }
}

window.filterLeaves = function(statusFilter) {
    const container = document.getElementById('leavesCardsGrid');
    if (!container) return;

    let filtered = allLeavesData;
    if (statusFilter !== 'all') {
        filtered = allLeavesData.filter(l => l.status === statusFilter);
    }

    renderLeaves(filtered, container);
};

window.loadLeaves = loadLeaves;

function renderLeaves(leaves, container) {
    if (!leaves.length) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; color:var(--text-dim); font-size:12px; padding:40px;">No leave requests found.</div>`;
        return;
    }

    let html = '';
    leaves.forEach(l => {
        const start = new Date(l.start_date);
        const end = new Date(l.end_date);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const requestedAtStr = fmtTime(l.requested_at);
        
        let typeBadgeClass = 'badge-annual';
        let leaveLabel = 'Annual';
        if (l.leave_type === 'sick') {
            typeBadgeClass = 'badge-sick';
            leaveLabel = 'Sick';
        } else if (l.leave_type === 'emergency') {
            typeBadgeClass = 'badge-emergency';
            leaveLabel = 'Emergency';
        }

        let statusClass = 'status-pending';
        let statusLabel = 'PENDING';
        if (l.status === 'approved') {
            statusClass = 'status-approved';
            statusLabel = 'APPROVED';
        } else if (l.status === 'rejected') {
            statusClass = 'status-rejected';
            statusLabel = 'NOT APPROVED';
        }

        html += `
            <div class="leave-card ${l.status}">
                <div class="leave-card-header">
                    <div class="leave-card-emp-info">
                        <span class="leave-card-name">${escapeHtml(l.employee_name)}</span>
                        <span class="leave-card-dept">${escapeHtml(l.employee_department)}</span>
                    </div>
                    <span class="leave-type-badge ${typeBadgeClass}">${leaveLabel} Leave</span>
                </div>
                <div class="leave-card-body">
                    <div class="leave-card-row">
                        <span class="leave-card-label">PERIOD:</span>
                        <span class="leave-card-val">${fmtDate(l.start_date)} → ${fmtDate(l.end_date)} (${diffDays} day${diffDays > 1 ? 's' : ''})</span>
                    </div>
                    ${l.reason ? `
                    <div class="leave-card-row reason-row">
                        <span class="leave-card-label">REASON:</span>
                        <p class="leave-card-reason">${escapeHtml(l.reason)}</p>
                    </div>` : ''}
                    <div class="leave-card-row requested-row">
                        <span class="leave-card-label">SUBMITTED:</span>
                        <span class="leave-card-val small-date">${requestedAtStr}</span>
                    </div>
                </div>
                <div class="leave-card-footer">
                    <div class="leave-status-row">
                        <span class="leave-card-label">STATUS:</span>
                        <span class="status-badge ${statusClass}">${statusLabel}</span>
                    </div>
                    
                    ${l.status === 'pending' ? `
                    <div class="leave-card-actions">
                        <button class="leave-action-btn approve" onclick="handleLeaveDecision(${l.id}, 'approved')">APPROVE</button>
                        <button class="leave-action-btn reject" onclick="handleLeaveDecision(${l.id}, 'rejected')">NOT APPROVED</button>
                    </div>
                    ` : `
                    <div class="leave-review-info">
                        ${l.reviewed_at ? `<div class="review-date">Reviewed: ${fmtTime(l.reviewed_at)}</div>` : ''}
                        ${l.review_note ? `<div class="review-note">"${escapeHtml(l.review_note)}"</div>` : ''}
                    </div>
                    `}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

window.handleLeaveDecision = async function(leaveId, status) {
    const statusText = status === 'approved' ? 'Approve' : 'Reject';
    const note = prompt(`Enter a review note / comment (optional) to send with this decision:`, `Decision: ${statusText}d by Admin`);
    if (note === null) return; // User cancelled prompt

    try {
        const response = await api(`/api/super-admin/leaves/${leaveId}/decision`, {
            method: 'POST',
            body: JSON.stringify({ status, review_note: note })
        });

        if (response) {
            showToast(`Leave application successfully ${status === 'approved' ? 'APPROVED' : 'REJECTED'}.`, 'success');
            await loadLeaves();
            // Also refresh stats since pending count changed
            await loadOverview();
        }
    } catch (e) {
        showToast('Decision failed: ' + e.message, 'error');
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

function escapeQuote(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'");
}

async function loadTrainingStudents() {
    try {
        const students = await api('/api/super-admin/training-students');
        const tbody = document.getElementById('stuTableBody');
        if (!tbody) return;
        if (!students || !students.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No students registered yet</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        students.forEach(s => {
            const tr = document.createElement('tr');
            
            const tdId = document.createElement('td');
            tdId.textContent = s.student_id;
            tr.appendChild(tdId);
            
            const tdPass = document.createElement('td');
            tdPass.style.fontFamily = 'monospace';
            tdPass.style.color = '#ffd700';
            tdPass.textContent = s.plain_password || '—';
            tr.appendChild(tdPass);

            const tdStatus = document.createElement('td');
            const spanStatus = document.createElement('span');
            spanStatus.className = `status-badge ${s.is_active ? 'status-active' : 'status-inactive'}`;
            spanStatus.textContent = s.is_active ? 'ACTIVE' : 'INACTIVE';
            tdStatus.appendChild(spanStatus);
            tr.appendChild(tdStatus);
            
            const tdDate = document.createElement('td');
            tdDate.textContent = fmtDate(s.created_at);
            tr.appendChild(tdDate);
            
            const tdActions = document.createElement('td');
            
            const btnToggle = document.createElement('button');
            btnToggle.className = 'action-btn';
            btnToggle.style.marginRight = '5px';
            btnToggle.style.padding = '5px 8px';
            btnToggle.style.fontSize = '9px';
            btnToggle.textContent = s.is_active ? 'DEACTIVATE' : 'ACTIVATE';
            btnToggle.addEventListener('click', () => window.toggleTrainingStudentStatus(s.id));
            tdActions.appendChild(btnToggle);
            
            const btnDelete = document.createElement('button');
            btnDelete.className = 'action-btn delete-btn';
            btnDelete.style.padding = '5px 8px';
            btnDelete.style.fontSize = '9px';
            btnDelete.textContent = 'DELETE';
            btnDelete.addEventListener('click', () => window.deleteTrainingStudent(s.id));
            tdActions.appendChild(btnDelete);
            
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    } catch (e) { showToast(e.message, 'error'); }
}

async function createTrainingStudent(e) {
    e.preventDefault();
    const studentId = document.getElementById('stuId').value.trim();
    const password = document.getElementById('stuPass').value.trim();

    try {
        await api('/api/super-admin/training-students', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId, password })
        });
        showToast('Student account created successfully!', 'success');
        document.getElementById('createStudentForm').reset();
        await loadTrainingStudents();
    } catch (e) { showToast(e.message, 'error'); }
}

async function toggleTrainingStudentStatus(id) {
    try {
        await api(`/api/super-admin/training-students/${id}/toggle-status`, { method: 'POST' });
        showToast('Student status updated', 'success');
        await loadTrainingStudents();
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteTrainingStudent(id) {
    if (!confirm('Are you sure you want to delete this student account?')) return;
    try {
        await api(`/api/super-admin/training-students/${id}`, { method: 'DELETE' });
        showToast('Student deleted successfully', 'success');
        await loadTrainingStudents();
    } catch (e) { showToast(e.message, 'error'); }
}

async function loadRecordingClasses() {
    try {
        const classes = await api('/api/super-admin/recording-classes');
        const listContainer = document.getElementById('classListContainer');
        if (!listContainer) return;
        if (!classes || !classes.length) {
            listContainer.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 20px; font-size: 12px;">No classes added yet.</div>';
            return;
        }
        listContainer.innerHTML = '';
        classes.forEach(c => {
            const item = document.createElement('div');
            item.className = 'class-drag-item';
            item.setAttribute('draggable', 'true');
            item.setAttribute('data-id', c.id);
            item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; cursor: move;';
            
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px; min-width: 0; flex: 1;">
                    <div style="font-weight: 900; color: var(--red); font-family: monospace; font-size: 16px;">☰</div>
                    <div style="min-width: 0; flex: 1;">
                        <h4 style="font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px;">${escapeHtml(c.title)}</h4>
                        <p style="font-size: 10px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">Video: ${escapeHtml(c.video_url)}</p>
                        ${c.notes_url ? `<p style="font-size: 10px; color: var(--red); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Notes: ${escapeHtml(c.notes_url)}</p>` : '<p style="font-size: 10px; color: rgba(255,255,255,0.25);">No notes link</p>'}
                    </div>
                </div>
                <div style="display: flex; gap: 8px; margin-left: 15px; flex-shrink: 0;">
                    <button class="action-btn" style="padding: 4px 8px; font-size: 9px;" onclick="window.editRecordingClass(${c.id}, '${escapeQuote(c.title)}', '${escapeQuote(c.video_url)}', '${escapeQuote(c.notes_url || "")}', '${escapeQuote(c.description || "")}')">EDIT</button>
                    <button class="action-btn delete-btn" style="padding: 4px 8px; font-size: 9px;" onclick="window.deleteRecordingClass(${c.id})">DELETE</button>
                </div>
            `;
            listContainer.appendChild(item);
        });
        initDragAndDrop();
    } catch (e) { showToast(e.message, 'error'); }
}

async function createRecordingClass(e) {
    e.preventDefault();
    const title = document.getElementById('classTitle').value.trim();
    const videoUrl = document.getElementById('classVideoUrl').value.trim();
    const notesUrl = document.getElementById('classNotesUrl').value.trim();
    const description = document.getElementById('classDesc').value.trim();

    try {
        await api('/api/super-admin/recording-classes', {
            method: 'POST',
            body: JSON.stringify({ title, video_url: videoUrl, notes_url: notesUrl, description })
        });
        showToast('Recording class added successfully!', 'success');
        document.getElementById('createClassForm').reset();
        await loadRecordingClasses();
    } catch (e) { showToast(e.message, 'error'); }
}

async function editRecordingClass(id, oldTitle, oldUrl, oldNotes, oldDesc) {
    const title = prompt("Enter Class Title:", oldTitle);
    if (title === null) return;
    const videoUrl = prompt("Enter Video URL:", oldUrl);
    if (videoUrl === null) return;
    const notesUrl = prompt("Enter Lecture Notes URL (Optional):", oldNotes);
    if (notesUrl === null) return;
    const description = prompt("Enter Description:", oldDesc);
    if (description === null) return;

    try {
        await api(`/api/super-admin/recording-classes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ title, video_url: videoUrl, notes_url: notesUrl, description })
        });
        showToast('Class updated successfully!', 'success');
        await loadRecordingClasses();
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteRecordingClass(id) {
    if (!confirm('Are you sure you want to delete this recording class?')) return;
    try {
        await api(`/api/super-admin/recording-classes/${id}`, { method: 'DELETE' });
        showToast('Class deleted successfully', 'success');
        await loadRecordingClasses();
    } catch (e) { showToast(e.message, 'error'); }
}

let dragSrcEl = null;

function initDragAndDrop() {
    const items = document.querySelectorAll('.class-drag-item');
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart, false);
        item.addEventListener('dragover', handleDragOver, false);
        item.addEventListener('drop', handleDrop, false);
        item.addEventListener('dragend', handleDragEnd, false);
    });
}

function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.style.opacity = '0.4';
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

async function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (dragSrcEl !== this) {
        const srcId = dragSrcEl.getAttribute('data-id');
        const destId = this.getAttribute('data-id');
        
        dragSrcEl.innerHTML = this.innerHTML;
        this.innerHTML = e.dataTransfer.getData('text/html');
        
        dragSrcEl.setAttribute('data-id', destId);
        this.setAttribute('data-id', srcId);
        
        const orderedIds = [];
        document.querySelectorAll('.class-drag-item').forEach(item => {
            orderedIds.push(item.getAttribute('data-id'));
        });
        
        try {
            await api('/api/super-admin/recording-classes/reorder', {
                method: 'POST',
                body: JSON.stringify({ ids: orderedIds })
            });
            showToast('Classes reordered successfully!', 'success');
        } catch (err) {
            showToast('Failed to save reorder: ' + err.message, 'error');
            await loadRecordingClasses();
        }
    }
    return false;
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    loadRecordingClasses();
}

// Expose functions globally for inline HTML event handlers
window.showSection = showSection;
window.toggleSidebar = toggleSidebar;
window.logout = logout;
window.toggleMaintenance = toggleMaintenance;
window.toggleDebugLogs = toggleDebugLogs;
window.createEmployee = createEmployee;
window.copyCredentials = copyCredentials;
window.exportUsersCSV = exportUsersCSV;
window.exportEmployeesCSV = exportEmployeesCSV;
window.exportVisitorsCSV = exportVisitorsCSV;
window.exportEmployeeActivity = exportEmployeeActivity;
window.loadEmployees = loadEmployees;
window.loadContactMessages = loadContactMessages;
window.loadEmployeeLogins = loadEmployeeLogins;
window.loadUserLogins = loadUserLogins;
window.loadSiteVisitors = loadSiteVisitors;
window.sendChatMessage = sendChatMessage;
window.createBulletin = createBulletin;
window.deleteBulletin = deleteBulletin;
window.loadBulletins = loadBulletins;
window.showToast = showToast;
window.togglePass = togglePass;
window.loadLeaves = loadLeaves;
window.filterLeaves = filterLeaves;

window.loadTrainingStudents = loadTrainingStudents;
window.createTrainingStudent = createTrainingStudent;
window.toggleTrainingStudentStatus = toggleTrainingStudentStatus;
window.deleteTrainingStudent = deleteTrainingStudent;
window.loadRecordingClasses = loadRecordingClasses;
window.createRecordingClass = createRecordingClass;
window.editRecordingClass = editRecordingClass;
window.deleteRecordingClass = deleteRecordingClass;


// ── Training Tasks & Progress Management ────────────────────────
async function loadTrainingTasks() {
    try {
        const tasks = await api('/api/super-admin/training-tasks');
        const tbody = document.getElementById('taskTableBody');
        if (!tbody) return;
        if (!tasks || !tasks.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No tasks assigned yet</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        tasks.forEach(t => {
            const tr = document.createElement('tr');
            
            const tdTitle = document.createElement('td');
            tdTitle.style.fontWeight = '600';
            tdTitle.textContent = t.title;
            tr.appendChild(tdTitle);
            
            const tdReward = document.createElement('td');
            tdReward.style.color = 'var(--red)';
            tdReward.style.fontFamily = 'monospace';
            tdReward.textContent = `₹${parseFloat(t.reward_amount).toFixed(2)}`;
            tr.appendChild(tdReward);
            
            const tdDeadline = document.createElement('td');
            tdDeadline.textContent = fmtTime(t.deadline);
            tr.appendChild(tdDeadline);
            
            const tdActions = document.createElement('td');
            const btnDelete = document.createElement('button');
            btnDelete.className = 'action-btn delete-btn';
            btnDelete.style.padding = '5px 8px';
            btnDelete.style.fontSize = '9px';
            btnDelete.textContent = 'DELETE';
            btnDelete.addEventListener('click', () => deleteTrainingTask(t.id));
            tdActions.appendChild(btnDelete);
            
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    } catch (e) {
        showToast('Failed to load training tasks: ' + e.message, 'error');
    }
}

async function createTrainingTask(e) {
    if (e) e.preventDefault();
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDesc').value.trim();
    const text_content = document.getElementById('taskTextContent').value.trim();
    const reward_amount = parseFloat(document.getElementById('taskReward').value) || 0.00;
    const deadline = document.getElementById('taskDeadline').value;

    try {
        await api('/api/super-admin/training-tasks', {
            method: 'POST',
            body: JSON.stringify({ title, description, text_content, reward_amount, deadline })
        });
        showToast('Training task created successfully!', 'success');
        document.getElementById('createTaskForm').reset();
        await loadTrainingTasks();
        await loadTrainersProgress();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function deleteTrainingTask(id) {
    if (!confirm('Are you sure you want to delete this training task? It will delete all trainer submissions associated with it.')) return;
    try {
        await api(`/api/super-admin/training-tasks/${id}`, { method: 'DELETE' });
        showToast('Task deleted successfully', 'success');
        await loadTrainingTasks();
        await loadTrainersProgress();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function loadTrainersProgress() {
    try {
        const progress = await api('/api/super-admin/trainers-progress');
        const tbody = document.getElementById('trainersProgressTableBody');
        if (!tbody) return;
        if (!progress || !progress.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No trainers registered yet</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        progress.forEach(tp => {
            const tr = document.createElement('tr');
            
            const tdId = document.createElement('td');
            tdId.style.fontWeight = '700';
            tdId.textContent = tp.student_id;
            tr.appendChild(tdId);
            
            const tdCompleted = document.createElement('td');
            tdCompleted.textContent = `${tp.completed_count} completed`;
            tr.appendChild(tdCompleted);
            
            const tdBase = document.createElement('td');
            tdBase.style.fontFamily = 'monospace';
            tdBase.textContent = `₹${parseFloat(tp.total_base_reward).toFixed(2)}`;
            tr.appendChild(tdBase);
            
            const tdDeductions = document.createElement('td');
            tdDeductions.style.fontFamily = 'monospace';
            tdDeductions.style.color = tp.total_deductions > 0 ? 'var(--red)' : '';
            tdDeductions.textContent = `₹${parseFloat(tp.total_deductions).toFixed(2)}`;
            tr.appendChild(tdDeductions);
            
            const tdIncentive = document.createElement('td');
            tdIncentive.style.fontFamily = 'monospace';
            tdIncentive.style.color = tp.incentive > 0 ? 'var(--success)' : '';
            tdIncentive.textContent = `₹${parseFloat(tp.incentive).toFixed(2)}`;
            tr.appendChild(tdIncentive);
            
            const tdNet = document.createElement('td');
            tdNet.style.fontFamily = 'monospace';
            tdNet.style.fontWeight = '800';
            tdNet.style.color = 'var(--red)';
            tdNet.textContent = `₹${parseFloat(tp.net_earnings).toFixed(2)}`;
            tr.appendChild(tdNet);
            
            const tdActions = document.createElement('td');
            if (tp.submissions && tp.submissions.length > 0) {
                const btnView = document.createElement('button');
                btnView.className = 'action-btn';
                btnView.style.padding = '5px 8px';
                btnView.style.fontSize = '9px';
                btnView.textContent = `VIEW SUBMISSIONS (${tp.submissions.length})`;
                btnView.addEventListener('click', () => showTrainersSubmissionsModal(tp.student_id, tp.submissions));
                tdActions.appendChild(btnView);
            } else {
                const span = document.createElement('span');
                span.style.color = 'rgba(255,255,255,0.2)';
                span.style.fontSize = '10px';
                span.textContent = 'No Submissions';
                tdActions.appendChild(span);
            }
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    } catch (e) {
        showToast('Failed to load trainers progress: ' + e.message, 'error');
    }
}

function showTrainersSubmissionsModal(studentId, submissions) {
    const modal = document.getElementById('previewModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody || !modalTitle) return;

    modalTitle.textContent = `SUBMISSIONS FOR ${studentId}`;
    
    let html = `
        <div style="width: 100%; display: flex; flex-direction: column; gap: 15px; text-align: left; color: #fff; font-family: 'Poppins', sans-serif;">
    `;
    
    submissions.forEach(sub => {
        const dateStr = new Date(sub.completed_at).toLocaleString('en-GB');
        const penaltyStr = sub.is_late 
            ? `<span style="color: var(--red); font-weight: bold;">[LATE SUBMISSION - 50% DEDUCTION APPLIED: -₹${parseFloat(sub.deduction_amount).toFixed(2)}]</span>` 
            : `<span style="color: var(--success); font-weight: bold;">[ON TIME]</span>`;
            
        html += `
            <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 15px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; flex-wrap: wrap; gap: 10px;">
                    <span style="font-weight: 800; font-size: 13.5px; color: var(--red);">${escapeHtml(sub.task_title)}</span>
                    <span style="font-size: 11px; color: var(--text-dim);">${dateStr}</span>
                </div>
                <div style="font-size: 11.5px; display: fl/* ═══════════════════════════════════════════
   TASK MARKETPLACE (ADMIN)
 ═══════════════════════════════════════════ */

let allMarketplaceTasks = [];
let allPendingSubmissions = [];

function switchTmTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`[data-target="${tabId}"]`);
    if (btn) btn.classList.add('active');
    
    document.querySelectorAll('.tm-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tm-panel').forEach(p => p.style.display = 'none');
    
    const panel = document.getElementById(tabId);
    if (panel) {
        panel.classList.add('active');
        panel.style.display = 'block';
    }

    if (tabId === 'tm-manage') loadMarketplaceTasks();
    if (tabId === 'tm-bids') loadReviewBidsSelect();
    if (tabId === 'tm-submissions') loadMarketplaceSubmissions();
    if (tabId === 'tm-analytics') loadMarketplaceAnalytics();
}

async function handleCreateTask(e) {
    e.preventDefault();
    const title = document.getElementById('ct_title').value.trim();
    const desc = document.getElementById('ct_desc').value.trim();
    const skills = document.getElementById('ct_skills').value.trim();
    const category = document.getElementById('ct_category').value.trim();
    const difficulty = document.getElementById('ct_difficulty').value;
    const budget = parseFloat(document.getElementById('ct_budget').value) || 0.00;
    const priority = document.getElementById('ct_priority').value;
    const deadline = document.getElementById('ct_deadline').value;

    const text_content = JSON.stringify({
        skills: skills,
        category: category,
        difficulty: difficulty,
        priority: priority,
        description: desc
    });

    try {
        await api('/api/super-admin/training-tasks', {
            method: 'POST',
            body: JSON.stringify({
                title: title,
                description: desc,
                text_content: text_content,
                reward_amount: budget,
                deadline: deadline
            })
        });
        showToast("Task Posted! It is now OPEN FOR BIDDING.", "success");
        document.getElementById('createTaskForm').reset();
        await loadMarketplaceTasks();
    } catch (err) {
        showToast("Failed to create task: " + err.message, "error");
    }
}

async function loadMarketplaceTasks() {
    try {
        const tasks = await api('/api/super-admin/marketplace/tasks');
        allMarketplaceTasks = tasks || [];
        renderTmManageTable();
    } catch (err) {
        showToast("Failed to load tasks: " + err.message, "error");
    }
}

function renderTmManageTable() {
    const tbody = document.getElementById('tmManageTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (allMarketplaceTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No tasks created yet.</td></tr>';
        return;
    }
    
    allMarketplaceTasks.forEach(t => {
        let parsed = {};
        try {
            if (t.text_content && t.text_content.startsWith('{')) {
                parsed = JSON.parse(t.text_content);
            }
        } catch (e) {}
        
        const difficulty = parsed.difficulty || 'Intermediate';
        const bidsCount = t.bids_count || 0;
        const assignedTo = t.assigned_student_id || '-';
        
        let statusColor = '#00f0ff'; // Open
        if (t.status === 'Assigned') statusColor = '#FFD600';
        if (t.status === 'Submitted') statusColor = '#00f0ff';
        if (t.status === 'Completed') statusColor = '#00E676';
        
        const actions = `
            <button class="action-btn delete-btn" style="padding: 4px 8px; font-size: 9px;" onclick="deleteTmTask(${t.id})">DELETE</button>
        `;
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding:15px 10px; font-weight:bold;">${escapeHtml(t.title)}</td>
                <td style="padding:15px 10px;">${escapeHtml(difficulty)}</td>
                <td style="padding:15px 10px;">${fmtTime(t.deadline)}</td>
                <td style="padding:15px 10px; color:${statusColor}; font-weight:600;">${t.status.toUpperCase()}</td>
                <td style="padding:15px 10px; font-weight:700;">${bidsCount}</td>
                <td style="padding:15px 10px; font-family:monospace; font-weight:700; color:var(--red);">${assignedTo}</td>
                <td style="padding:15px 10px;">${actions}</td>
            </tr>
        `;
    });
}

async function deleteTmTask(id) {
    if (!confirm('Are you sure you want to delete this task? All bids and progress associated with it will be deleted.')) return;
    try {
        await api(`/api/super-admin/training-tasks/${id}`, { method: 'DELETE' });
        showToast('Task deleted successfully', 'success');
        await loadMarketplaceTasks();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function loadReviewBidsSelect() {
    try {
        const tasks = await api('/api/super-admin/marketplace/tasks');
        const select = document.getElementById('reviewBidTaskSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Select an Open Task --</option>';
        
        // Filter tasks that are Open
        const openTasks = (tasks || []).filter(t => t.status === 'Open');
        openTasks.forEach(t => {
            select.innerHTML += `<option value="${t.id}">${escapeHtml(t.title)} (${t.bids_count} bids)</option>`;
        });
        
        document.getElementById('tmBidsTable').innerHTML = '<tr><td colspan="5" class="empty-row">Select a task above to review bids.</td></tr>';
    } catch (err) {
        showToast("Failed to load tasks: " + err.message, "error");
    }
}

async function loadBidsForTask() {
    const taskId = document.getElementById('reviewBidTaskSelect').value;
    const tbody = document.getElementById('tmBidsTable');
    if (!tbody) return;
    
    if (!taskId) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Select a task to review bids.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Loading bids...</td></tr>';
    
    try {
        const bids = await api(`/api/super-admin/marketplace/tasks/${taskId}/bids`);
        if (!bids || bids.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No bids placed for this task yet.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        bids.forEach(b => {
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding:15px 10px; font-weight:bold; font-family:monospace; color:var(--red);">${escapeHtml(b.student_id)}</td>
                    <td style="padding:15px 10px; font-weight:bold; color:#00E676;">₹${parseFloat(b.bid_amount).toFixed(2)}</td>
                    <td style="padding:15px 10px; font-weight:600;">${b.delivery_days} Days</td>
                    <td style="padding:15px 10px; font-size:12px; color:#ccc; max-width:250px; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(b.proposal_message)}">${escapeHtml(b.proposal_message)}</td>
                    <td style="padding:15px 10px;">
                        <button class="action-btn" style="background:var(--primary); color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;" onclick="assignTaskToBid(${taskId}, '${b.student_id}', ${b.bid_amount})">Assign</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-row" style="color:var(--red);">Error: ${err.message}</td></tr>`;
    }
}

async function assignTaskToBid(taskId, studentId, bidAmount) {
    if (!confirm(`Assign this task to student ${studentId} for ₹${bidAmount}?`)) return;
    
    try {
        await api('/api/super-admin/marketplace/assign', {
            method: 'POST',
            body: JSON.stringify({
                task_id: taskId,
                student_id: studentId,
                bid_amount: bidAmount
            })
        });
        showToast(`Task assigned successfully to ${studentId}!`, "success");
        await loadReviewBidsSelect();
    } catch (err) {
        showToast("Assignment failed: " + err.message, "error");
    }
}

async function loadMarketplaceSubmissions() {
    const tbody = document.getElementById('tmSubmissionsTable');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Loading submissions...</td></tr>';
    
    try {
        const subs = await api('/api/super-admin/marketplace/submissions');
        allPendingSubmissions = subs || [];
        renderTmSubmissionsTable();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-row" style="color:var(--red);">Error: ${err.message}</td></tr>`;
    }
}

function renderTmSubmissionsTable() {
    const tbody = document.getElementById('tmSubmissionsTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (allPendingSubmissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No pending submissions to review.</td></tr>';
        return;
    }
    
    allPendingSubmissions.forEach(s => {
        let parsedSub = {};
        try {
            parsedSub = JSON.parse(s.submission_text);
        } catch (e) {
            parsedSub = { notes: s.submission_text };
        }
        
        let detailsHtml = `
            <div style="font-size:11px; display:flex; flex-direction:column; gap:4px; max-width: 300px;">
                ${parsedSub.github_url ? `<div><strong>GitHub:</strong> <a href="${escapeHtml(parsedSub.github_url)}" target="_blank" style="color:var(--red); text-decoration:underline;">Link</a></div>` : ''}
                ${parsedSub.demo_url ? `<div><strong>Demo:</strong> <a href="${escapeHtml(parsedSub.demo_url)}" target="_blank" style="color:var(--red); text-decoration:underline;">Link</a></div>` : ''}
                ${parsedSub.notes ? `<div style="white-space:pre-wrap; background:rgba(0,0,0,0.3); padding:6px; border-radius:4px; border:1px solid rgba(255,255,255,0.05); color:#eee;">"${escapeHtml(parsedSub.notes)}"</div>` : ''}
            </div>
        `;
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding:15px 10px; font-weight:bold; font-family:monospace; color:var(--red);">${escapeHtml(s.student_id)}</td>
                <td style="padding:15px 10px; font-weight:bold;">${escapeHtml(s.task_title)}</td>
                <td style="padding:15px 10px;">${fmtTime(s.task_deadline)}</td>
                <td style="padding:15px 10px; font-weight:bold; color:#ffd700;">₹${parseFloat(s.bid_amount).toFixed(2)}</td>
                <td style="padding:15px 10px;">${detailsHtml}</td>
                <td style="padding:15px 10px;">
                    <button class="action-btn" style="background:#00E676; color:#000; border:none; padding:5px 10px; border-radius:4px; font-weight:bold; cursor:pointer;" onclick="approveSub('${s.student_id}', ${s.task_id})">Approve</button>
                </td>
            </tr>
        `;
    });
}

async function approveSub(studentId, taskId) {
    if (!confirm(`Approve submission for ${studentId}?`)) return;
    try {
        await api('/api/super-admin/marketplace/approve-submission', {
            method: 'POST',
            body: JSON.stringify({
                task_id: taskId,
                student_id: studentId
            })
        });
        showToast("Submission approved successfully!", "success");
        await loadMarketplaceSubmissions();
    } catch (err) {
        showToast("Failed to approve submission: " + err.message, "error");
    }
}

async function loadMarketplaceAnalytics() {
    try {
        const tasks = await api('/api/super-admin/marketplace/tasks');
        const list = tasks || [];
        
        let total = list.length;
        let open = list.filter(t => t.status === 'Open').length;
        let assigned = list.filter(t => t.status === 'Assigned' || t.status === 'Submitted').length;
        let completed = list.filter(t => t.status === 'Completed').length;
        
        let totalBids = 0;
        list.forEach(t => totalBids += (t.bids_count || 0));
        
        document.getElementById('ana_total').innerText = total;
        document.getElementById('ana_open').innerText = open;
        document.getElementById('ana_assigned').innerText = assigned;
        document.getElementById('ana_completed').innerText = completed;
        document.getElementById('ana_bids').innerText = totalBids;
    } catch (err) {
        showToast("Failed to load analytics: " + err.message, "error");
    }
}

// Hook into showSection of super admin
const oldShowSection = window.showSection;
window.showSection = function(sectionId) {
    if (sectionId === 'task-marketplace') {
        currentSection = sectionId;
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        
        const sec = document.getElementById('section-task-marketplace');
        if (sec) sec.classList.add('active');
        const nav = document.querySelector(`[data-section="${sectionId}"]`);
        if (nav) nav.classList.add('active');
        
        document.getElementById('pageTitle').textContent = 'TASK MARKETPLACE';
        document.getElementById('pageSubtitle').textContent = 'Review bids, assign work, and approve deliverables';
        
        switchTmTab('tm-manage');
        if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
    } else {
        if (oldShowSection) oldShowSection(sectionId);
    }
};

window.switchTmTab = switchTmTab;
window.handleCreateTask = handleCreateTask;
window.deleteTmTask = deleteTmTask;
window.loadBidsForTask = loadBidsForTask;
window.assignTaskToBid = assignTaskToBid;
window.loadMarketplaceSubmissions = loadMarketplaceSubmissions;
window.approveSub = approveSub;

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

