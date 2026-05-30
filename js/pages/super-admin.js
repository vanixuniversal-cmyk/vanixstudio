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
    await animateLoader();
    token = sessionStorage.getItem('sa_token');
    if (!token) {
        window.location.href = '../pages/employee-login.html';
        return;
    }
    document.getElementById('saLayout').classList.add('visible');
    startClock();
    initParticles();
    await loadOverview();
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
    const validSections = ['overview', 'create-employee', 'manage-employees', 'manage-users', 'contact-messages', 'activity', 'site-visitors', 'hub'];
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
    } else if (name === 'activity') {
        t = 'ACTIVITY FEED'; s = 'Real-time login and system activity log';
    } else if (name === 'site-visitors') {
        t = 'SITE VISITOR ANALYTICS'; s = 'All site visits — page, IP address, referrer & time spent';
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
    if (name === 'activity') loadActivity();
    if (name === 'site-visitors') loadSiteVisitors();
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
            tdInvite.style.color = '#ff0000';
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

// ── Activity Feed ─────────────────────────────────────
async function loadActivity() {
    try {
        const logs = await api('/api/super-admin/recent-logins?limit=50');
        const tbody = document.getElementById('activityBody');
        if (!tbody) return;
        if (!logs || !logs.length) {
            tbody.innerHTML = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;
            td.className = 'empty-row';
            td.textContent = 'No activity recorded';
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
    } catch (e) { showToast(e.message, 'error'); }
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

function logout() {
    stopHubPolling();
    sessionStorage.removeItem('sa_token');
    sessionStorage.removeItem('sa_email');
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

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}
