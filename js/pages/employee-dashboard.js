// ══════════════════════════════════════════════════════
// EMPLOYEE PORTAL JS — VANIX STUDIO Redesign
// ══════════════════════════════════════════════════════
// API base set by js/api-config.js — auto-detects dev vs production
const API = window.API_BASE || '';
let token = null;
let profile = null;
let clockInterval = null;
let clockedInAt = null;
let isClockedIn = false;
let cachedDirectory = [];

// ── Boot ──────────────────────────────────────────────
window.addEventListener('load', async () => {
    await animateLoader();
    token = sessionStorage.getItem('emp_token');
    if (!token) { window.location.href = 'employee-login.html'; return; }
    document.getElementById('empLayout').style.opacity = '1';
    startClock();
    await loadProfile();
    await loadDirectory();
    await loadAttendance();
    // Default load leaves data too, just in case
    await loadLeaves();
});

async function animateLoader() {
    const fill = document.getElementById('loaderFill');
    let pct = 0;
    return new Promise(resolve => {
        const iv = setInterval(() => {
            pct += Math.random() * 35;
            if (pct >= 100) { pct = 100; clearInterval(iv); }
            fill.style.width = pct + '%';
            if (pct >= 100) setTimeout(() => { document.getElementById('loader').classList.add('hidden'); resolve(); }, 400);
        }, 150);
    });
}

// ── Wall Clock ────────────────────────────────────────
function startClock() {
    function tick() { document.getElementById('headerClock').textContent = new Date().toLocaleTimeString('en-US', { hour12: false }); }
    tick(); setInterval(tick, 1000);
}

// ── API helper ────────────────────────────────────────
async function api(path, opts = {}) {
    const resp = await fetch(`${API}${path}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
        ...opts
    });
    if (resp.status === 401) { logout(); return null; }
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.detail || 'Request failed'); }
    return resp.json();
}

// ── Tab Section Router Navigation ─────────────────────
function showSection(name) {
    const validTabs = ['overview', 'attendance', 'leaves'];
    if (!validTabs.includes(name)) return;

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    // Show selected section
    const targetSection = document.getElementById(`section-${name}`);
    if (targetSection) targetSection.classList.add('active');
    
    // Highlight sidebar active button
    const targetBtn = document.getElementById(`btn-${name}`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    } else {
        // Fallback search
        document.querySelectorAll('.nav-btn').forEach(b => {
            const clickAttr = b.getAttribute('onclick');
            if (clickAttr && clickAttr.includes(name)) b.classList.add('active');
        });
    }

    const titles = {
        'overview': { title: 'OVERVIEW', sub: 'Welcome to your central workspace' },
        'attendance': { title: 'TIME TRACKER', sub: 'Your session records & time tracking' },
        'leaves': { title: 'LEAVE PORTAL', sub: 'Request paid time off & review status' },
    };
    
    let titleInfo = null;
    if (name === 'overview') {
        titleInfo = titles.overview;
    } else if (name === 'attendance') {
        titleInfo = titles.attendance;
    } else if (name === 'leaves') {
        titleInfo = titles.leaves;
    }

    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    if (pageTitle && titleInfo) pageTitle.textContent = titleInfo.title;
    if (pageSubtitle && titleInfo) pageSubtitle.textContent = titleInfo.sub;
    
    if (name === 'overview') {
        loadDirectory();
    }
    if (name === 'attendance') {
        loadAttendance();
    }
    if (name === 'leaves') {
        loadLeaves();
        syncLeaveBalancesForm();
    }
    if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
}

// ── Load Profile & Metrics ────────────────────────────
async function loadProfile() {
    try {
        profile = await api('/api/employee/me');
        if (!profile) return;
        
        const initials = profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        
        // Sidebar profile sync
        document.getElementById('empAvatarInitials').textContent = initials;
        document.getElementById('empNameDisplay').textContent = profile.name;
        document.getElementById('empDeptDisplay').textContent = profile.department;
        document.getElementById('empInviteDisplay').textContent = 'INVITE: ' + (profile.invite_code || '');
        document.getElementById('empCompanyIdDisplay').textContent = profile.company_id || '—';
        
        // Overview dashboard profile sync
        document.getElementById('overviewAvatarInitials').textContent = initials;
        document.getElementById('overviewNameDisplay').textContent = profile.name;
        document.getElementById('overviewDeptDisplay').textContent = profile.department;
        
        // Status toggle initial sync
        const statusVal = profile.status || 'Active';
        const selectEl = document.getElementById('statusSelect');
        if (selectEl) selectEl.value = statusVal;
        updateStatusDotUI(statusVal);
        
        // Render Adaptive Department metrics
        renderDepartmentKPIs(profile.department);
        
        // Attendance tab summary stats
        document.getElementById('daysWorked').textContent = profile.days_worked_this_month;
        document.getElementById('annualBal').textContent = profile.annual_leave_balance;
        document.getElementById('sickBal').textContent = profile.sick_leave_balance;
        
        // Overview pto cards
        document.getElementById('overviewAnnualBal').textContent = `${profile.annual_leave_balance} days remaining`;
        document.getElementById('overviewSickBal').textContent = `${profile.sick_leave_balance} days remaining`;
        document.getElementById('overviewEmergBal').textContent = `${profile.emergency_leave_balance} days remaining`;
        
        document.getElementById('overviewAnnualBar').style.width = Math.round((profile.annual_leave_balance / 15) * 100) + '%';
        document.getElementById('overviewSickBar').style.width = Math.round((profile.sick_leave_balance / 10) * 100) + '%';
        document.getElementById('overviewEmergBar').style.width = Math.round((profile.emergency_leave_balance / 5) * 100) + '%';
        
        // Detailed Attendance Leave balance bars
        updateBalance('annual', profile.annual_leave_balance, 15);
        updateBalance('sick', profile.sick_leave_balance, 10);
        updateBalance('emerg', profile.emergency_leave_balance, 5);
        
        // Clock state sync
        isClockedIn = profile.is_clocked_in;
        if (isClockedIn && profile.today_clock_in) {
            clockedInAt = new Date(profile.today_clock_in);
            startElapsedTimer();
        }
        updateClockUI();
        
        // Dates displaying
        const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        document.getElementById('clockDateDisplay').textContent = dateStr;
    } catch (e) { showToast('Failed to load profile: ' + e.message, 'error'); }
}

function updateBalance(type, value, max) {
    const pct = Math.round((value / max) * 100);
    let valId, barId;
    if (type === 'annual') {
        valId = 'annualUsed'; barId = 'annualBar';
    } else if (type === 'sick') {
        valId = 'sickUsed'; barId = 'sickBar';
    } else if (type === 'emerg') {
        valId = 'emergUsed'; barId = 'emergBar';
    } else {
        return;
    }
    const valEl = document.getElementById(valId);
    const barEl = document.getElementById(barId);
    if (valEl) valEl.textContent = value;
    if (barEl) barEl.style.width = pct + '%';
}

// ── Interactive Status Toggle ─────────────────────────
async function changeStatus(status) {
    try {
        const res = await api('/api/employee/status', {
            method: 'POST',
            body: JSON.stringify({ status })
        });
        if (res) {
            updateStatusDotUI(status);
            showToast(`✅ Status set to "${status}"`, 'success');
        }
    } catch (e) {
        showToast('Failed to update status: ' + e.message, 'error');
    }
}

function updateStatusDotUI(status) {
    const dot = document.getElementById('overviewStatusDot');
    if (!dot) return;
    
    // Clear old status classes
    dot.className = 'status-dot';
    
    if (status === 'Active') {
        dot.classList.add('status-active');
    } else if (status === 'In a Meeting') {
        dot.classList.add('status-meeting');
    } else if (status === 'Remote') {
        dot.classList.add('status-remote');
    } else if (status === 'On Leave') {
        dot.classList.add('status-leave');
    }
}

// ── Render Adapting Department Metrics ────────────────
function renderDepartmentKPIs(department) {
    const titleEl = document.getElementById('kpiWidgetTitle');
    const container = document.getElementById('kpiGridContainer');
    if (!container || !titleEl) return;
    
    const deptUpper = department.toUpperCase();
    
    if (deptUpper.includes('VFX') || deptUpper.includes('CGI') || deptUpper.includes('ART') || deptUpper.includes('DESIGN')) {
        titleEl.textContent = 'VFX PIPELINE METRICS';
        container.innerHTML = `
            <div class="kpi-mini-card">
                <div class="kpi-val" style="color: var(--red);">24 / 30</div>
                <div class="kpi-lbl">GPU Renders (Weekly)</div>
            </div>
            <div class="kpi-mini-card">
                <div class="kpi-val" style="color: var(--green);">18</div>
                <div class="kpi-lbl">Assets Created</div>
            </div>
            <div class="kpi-mini-card">
                <div class="kpi-val" style="color: var(--blue);">4</div>
                <div class="kpi-lbl">Active Shot Tasks</div>
            </div>
            <div class="kpi-mini-card">
                <div class="kpi-val" style="color: var(--orange);">98.4%</div>
                <div class="kpi-lbl">GPU Render Success</div>
            </div>
        `;
    } else if (deptUpper.includes('AI') || deptUpper.includes('PRODUCTION') || deptUpper.includes('DEV') || deptUpper.includes('ENG')) {
        titleEl.textContent = 'AI CINEMATIC METRICS';
        container.innerHTML = `
            <div class="kpi-mini-card">
                <div class="kpi-val" style="color: var(--red);">142</div>
                <div class="kpi-lbl">LLM Script Generations</div>
            </div>
            <div class="kpi-mini-card">
                <div class="kpi-val" style="color: var(--green);">95</div>
                <div class="kpi-lbl">AI Scenes Processed</div>
            </div>
            <div class="kpi-mini-card">
                <div class="kpi-val" style="color: var(--blue);">12</div>
                <div class="kpi-lbl">Git Commits Today</div>
            </div>
            <div class="kpi-mini-card">
                <div class="kpi-val" style="color: var(--orange);">32ms</div>
                <div class="kpi-lbl">Latency Sync</div>
            </div>
        `;
    } else {
        // Default / Sales / Admin
        titleEl.textContent = 'PORTAL GOAL METRICS';
        container.innerHTML = `
            <div class="kpi-mini-card">
                <div class="kpi-val" style="color: var(--red);">45</div>
                <div class="kpi-lbl">Colleague Syncs</div>
            </div>
            <div class="kpi-mini-card">
                <div class="kpi-val" style="color: var(--green);">3 / 5</div>
                <div class="kpi-lbl">Weekly Goals Hit</div>
            </div>
            <div class="kpi-mini-card">
                <div class="kpi-val" style="color: var(--blue);">92%</div>
                <div class="kpi-lbl">Task Completeness</div>
            </div>
            <div class="kpi-mini-card">
                <div class="kpi-val" style="color: var(--orange);">100%</div>
                <div class="kpi-lbl">Portal Uptime</div>
            </div>
        `;
    }
}

// ── Colleague Directory & Who's Away ──────────────────
async function loadDirectory() {
    try {
        const directory = await api('/api/employee/directory');
        if (!directory) return;
        cachedDirectory = directory;
        renderDirectory(directory);
    } catch (e) {
        console.error('Failed to load colleague directory: ', e);
    }
}

function renderDirectory(directory) {
    const grid = document.getElementById('directoryGrid');
    const awayList = document.getElementById('awayList');
    if (!grid || !awayList) return;
    
    // 1. Render Colleague Directory Cards
    if (directory.length <= 1) {
        grid.innerHTML = '';
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'dir-loading';
        emptyDiv.textContent = 'No other colleagues found';
        grid.appendChild(emptyDiv);
    } else {
        // Exclude current employee from directory count/views
        const others = directory.filter(emp => emp.id !== profile.id);
        grid.innerHTML = '';
        others.forEach(emp => {
            const initials = emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            
            const card = document.createElement('div');
            card.className = 'colleague-card';
            
            const avatar = document.createElement('div');
            avatar.className = 'colleague-avatar';
            avatar.textContent = initials;
            card.appendChild(avatar);
            
            const details = document.createElement('div');
            details.className = 'colleague-details';
            
            const name = document.createElement('div');
            name.className = 'colleague-name';
            name.textContent = emp.name;
            details.appendChild(name);
            
            const meta = document.createElement('div');
            meta.className = 'colleague-meta';
            
            const badge = document.createElement('span');
            badge.className = `colleague-badge ${(emp.status || '').replace(/ /g, '')}`;
            badge.textContent = emp.status;
            meta.appendChild(badge);
            
            const separator = document.createElement('span');
            separator.style.color = 'rgba(255,255,255,0.2)';
            separator.textContent = ' • ';
            meta.appendChild(separator);
            
            const dept = document.createElement('span');
            dept.style.fontSize = '8px';
            dept.style.color = 'rgba(255,255,255,0.4)';
            dept.textContent = emp.department;
            meta.appendChild(dept);
            
            details.appendChild(meta);
            card.appendChild(details);
            grid.appendChild(card);
        });
    }
    
    // 2. Render Who's Away Widget (Out of Office)
    const awayEmployees = directory.filter(emp => emp.is_away || emp.status === 'On Leave');
    if (awayEmployees.length === 0) {
        awayList.innerHTML = '';
        const emptyDiv = document.createElement('div');
        emptyDiv.style.textAlign = 'center';
        emptyDiv.style.color = 'var(--text-muted)';
        emptyDiv.style.fontSize = '10px';
        emptyDiv.style.padding = '24px 10px';
        emptyDiv.textContent = '🎉 Everyone is in the studio today!';
        awayList.appendChild(emptyDiv);
    } else {
        awayList.innerHTML = '';
        awayEmployees.forEach(emp => {
            const initials = emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            
            const item = document.createElement('div');
            item.className = 'away-item';
            
            const info = document.createElement('div');
            info.className = 'away-info';
            
            const avatar = document.createElement('div');
            avatar.className = 'away-avatar';
            avatar.textContent = initials;
            info.appendChild(avatar);
            
            const textDiv = document.createElement('div');
            const name = document.createElement('div');
            name.className = 'away-name';
            name.textContent = emp.name;
            textDiv.appendChild(name);
            
            const dept = document.createElement('div');
            dept.className = 'away-dept';
            dept.textContent = emp.department;
            textDiv.appendChild(dept);
            
            info.appendChild(textDiv);
            item.appendChild(info);
            
            const pill = document.createElement('span');
            pill.className = 'away-pill';
            pill.textContent = 'AWAY';
            item.appendChild(pill);
            
            awayList.appendChild(item);
        });
    }
}

function filterDirectory(query) {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) {
        renderDirectory(cachedDirectory);
        return;
    }
    
    const filtered = cachedDirectory.filter(emp => 
        emp.name.toLowerCase().includes(cleanQuery) || 
        emp.department.toLowerCase().includes(cleanQuery) ||
        emp.email.toLowerCase().includes(cleanQuery)
    );
    
    renderDirectory(filtered);
}

// ── Clock In / Out ────────────────────────────────────
async function toggleClock() {
    const btn = document.getElementById('clockBtn');
    const overviewBtn = document.getElementById('overviewClockBtn');
    if (btn) btn.disabled = true;
    if (overviewBtn) { overviewBtn.disabled = true; overviewBtn.textContent = 'PROCESSING...'; }
    
    try {
        if (!isClockedIn) {
            const data = await api('/api/employee/clock-in', { method: 'POST' });
            if (!data) return;
            isClockedIn = true;
            clockedInAt = new Date(data.clock_in);
            startElapsedTimer();
            showToast('✅ Clocked in successfully!', 'success');
        } else {
            const data = await api('/api/employee/clock-out', { method: 'POST' });
            if (!data) return;
            isClockedIn = false;
            stopElapsedTimer();
            showToast(`Clocked out — ${data.hours_worked}h worked`, 'success');
            
            const elapsed = formatHours(data.hours_worked);
            document.getElementById('clockTimer').textContent = elapsed;
            document.getElementById('overviewTimer').textContent = elapsed;
            
            await loadAttendance();
        }
        updateClockUI();
        loadProfile(); // reload balances
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        if (btn) btn.disabled = false;
        if (overviewBtn) overviewBtn.disabled = false;
    }
}

function updateClockUI() {
    const btn = document.getElementById('clockBtn');
    const info = document.getElementById('clockInfo');
    const timer = document.getElementById('clockTimer');
    const label = document.getElementById('clockStatusLabel');
    
    const overviewBtn = document.getElementById('overviewClockBtn');
    const overviewInfo = document.getElementById('overviewClockInfo');
    const overviewTimer = document.getElementById('overviewTimer');
    const overviewLabel = document.getElementById('overviewClockStatusLabel');
    
    const timeStr = clockedInAt ? clockedInAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
    
    if (isClockedIn) {
        const activeText = '⏹ CLOCK OUT';
        const activeInfo = clockedInAt ? `Clocked in at ${timeStr}` : '';
        const activeLabel = "TODAY'S SESSION";
        
        if (btn) {
            btn.textContent = activeText;
            btn.classList.add('clocked');
        }
        if (timer) {
            timer.classList.add('clocked-in');
        }
        if (label) label.textContent = activeLabel;
        if (info) info.textContent = activeInfo;
        
        if (overviewBtn) {
            overviewBtn.textContent = activeText;
            overviewBtn.classList.add('clocked');
        }
        if (overviewTimer) {
            overviewTimer.classList.add('clocked-in');
        }
        if (overviewLabel) overviewLabel.textContent = activeLabel;
        if (overviewInfo) overviewInfo.textContent = activeInfo;
    } else {
        const inactiveText = '⏱ CLOCK IN';
        const inactiveInfo = 'Not clocked in today';
        const inactiveLabel = "TODAY'S HOURS";
        
        if (btn) {
            btn.textContent = inactiveText;
            btn.classList.remove('clocked');
        }
        if (timer) {
            timer.classList.remove('clocked-in');
        }
        if (label) label.textContent = inactiveLabel;
        if (info) info.textContent = inactiveInfo;
        
        if (overviewBtn) {
            overviewBtn.textContent = inactiveText;
            overviewBtn.classList.remove('clocked');
        }
        if (overviewTimer) {
            overviewTimer.classList.remove('clocked-in');
        }
        if (overviewLabel) overviewLabel.textContent = inactiveLabel;
        if (overviewInfo) overviewInfo.textContent = inactiveInfo;
    }
}

function startElapsedTimer() {
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(() => {
        if (!clockedInAt) return;
        const elapsed = (Date.now() - clockedInAt.getTime()) / 1000;
        const elapsedStr = fmtElapsed(elapsed);
        
        const detailedTimer = document.getElementById('clockTimer');
        const compactTimer = document.getElementById('overviewTimer');
        
        if (detailedTimer) detailedTimer.textContent = elapsedStr;
        if (compactTimer) compactTimer.textContent = elapsedStr;
    }, 1000);
}

function stopElapsedTimer() {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
}

function fmtElapsed(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function formatHours(h) { const hrs = Math.floor(h); const mins = Math.round((h - hrs) * 60); return `${hrs}h ${mins}m`; }

// ── Attendance Log ────────────────────────────────────
async function loadAttendance() {
    try {
        const records = await api('/api/employee/attendance?days=30');
        const tbody = document.getElementById('attendanceBody');
        if (!tbody) return;
        
        if (!records || !records.length) {
            tbody.innerHTML = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.className = 'empty-row';
            td.textContent = 'No attendance records yet';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        let totalHours = 0;
        tbody.innerHTML = '';
        records.forEach(r => {
            totalHours += r.hours_worked;
            
            const tr = document.createElement('tr');
            
            const tdDate = document.createElement('td');
            tdDate.style.color = '#fff';
            tdDate.textContent = fmtDate(r.date);
            tr.appendChild(tdDate);
            
            const tdClockIn = document.createElement('td');
            if (r.clock_in) {
                tdClockIn.textContent = fmtTimePart(r.clock_in);
            } else {
                const span = document.createElement('span');
                span.style.color = 'rgba(255,255,255,0.2)';
                span.textContent = '—';
                tdClockIn.appendChild(span);
            }
            tr.appendChild(tdClockIn);
            
            const tdClockOut = document.createElement('td');
            if (r.clock_out) {
                tdClockOut.textContent = fmtTimePart(r.clock_out);
            } else {
                const span = document.createElement('span');
                span.style.color = 'rgba(255,0,0,0.4)';
                span.textContent = 'Still In';
                tdClockOut.appendChild(span);
            }
            tr.appendChild(tdClockOut);
            
            const tdHours = document.createElement('td');
            tdHours.textContent = r.hours_worked > 0 ? r.hours_worked.toFixed(1) + ' hrs' : '—';
            tr.appendChild(tdHours);
            
            const tdStatus = document.createElement('td');
            const spanStatus = document.createElement('span');
            spanStatus.className = `badge badge-${r.status}`;
            spanStatus.textContent = (r.status || '').toUpperCase();
            tdStatus.appendChild(spanStatus);
            tr.appendChild(tdStatus);
            
            tbody.appendChild(tr);
        });
        
        const totalHoursEl = document.getElementById('totalHours');
        if (totalHoursEl) totalHoursEl.textContent = totalHours.toFixed(1) + 'h';
    } catch (e) { showToast(e.message, 'error'); }
}

// ── Leave History ─────────────────────────────────────
async function loadLeaves() {
    try {
        const leaves = await api('/api/employee/leaves');
        const tbody = document.getElementById('leavesBody');
        if (!tbody) return;
        
        if (!leaves || !leaves.length) {
            tbody.innerHTML = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 8;
            td.className = 'empty-row';
            td.textContent = 'No leave requests yet';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        tbody.innerHTML = '';
        leaves.forEach(l => {
            const days = Math.ceil((new Date(l.end_date) - new Date(l.start_date)) / 86400000) + 1;
            
            const tr = document.createElement('tr');
            
            const tdType = document.createElement('td');
            const spanType = document.createElement('span');
            spanType.className = `badge badge-${l.leave_type}`;
            spanType.textContent = (l.leave_type || '').toUpperCase();
            tdType.appendChild(spanType);
            tr.appendChild(tdType);
            
            const tdStart = document.createElement('td');
            tdStart.textContent = l.start_date;
            tr.appendChild(tdStart);
            
            const tdEnd = document.createElement('td');
            tdEnd.textContent = l.end_date;
            tr.appendChild(tdEnd);
            
            const tdDays = document.createElement('td');
            tdDays.textContent = days;
            tr.appendChild(tdDays);
            
            const tdReason = document.createElement('td');
            tdReason.style.fontSize = '11px';
            tdReason.textContent = l.reason || '—';
            tr.appendChild(tdReason);
            
            const tdStatus = document.createElement('td');
            const spanStatus = document.createElement('span');
            spanStatus.className = `badge badge-${l.status}`;
            spanStatus.textContent = (l.status || '').toUpperCase();
            tdStatus.appendChild(spanStatus);
            tr.appendChild(tdStatus);
            
            const tdNote = document.createElement('td');
            tdNote.style.fontSize = '11px';
            tdNote.style.color = 'rgba(255,255,255,0.4)';
            tdNote.textContent = l.review_note || '—';
            tr.appendChild(tdNote);

            const tdAction = document.createElement('td');
            if (l.status === 'pending') {
                const btnCancel = document.createElement('button');
                btnCancel.className = 'btn-small';
                btnCancel.style.background = 'linear-gradient(135deg, var(--red), #ff3333)';
                btnCancel.style.color = '#fff';
                btnCancel.style.border = 'none';
                btnCancel.style.padding = '4px 8px';
                btnCancel.style.fontSize = '9px';
                btnCancel.style.cursor = 'pointer';
                btnCancel.style.borderRadius = '4px';
                btnCancel.textContent = 'CANCEL';
                btnCancel.addEventListener('click', () => deleteLeaveRequest(l.id));
                tdAction.appendChild(btnCancel);
            } else {
                const span = document.createElement('span');
                span.style.color = 'rgba(255,255,255,0.2)';
                span.textContent = '—';
                tdAction.appendChild(span);
            }
            tr.appendChild(tdAction);
            
            tbody.appendChild(tr);
        });
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteLeaveRequest(leaveId) {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    try {
        await api(`/api/employee/leaves/${leaveId}`, {
            method: 'DELETE'
        });
        showToast('Leave request cancelled successfully', 'success');
        await loadProfile(); // Refresh leave balances
        await loadLeaves();   // Refresh leave history
    } catch (e) {
        showToast('Failed to cancel leave request: ' + e.message, 'error');
    }
}

// ── Submit Leave Request ──────────────────────────────
async function submitLeaveRequest() {
    const btn = document.getElementById('submitLeaveBtn');
    const msg = document.getElementById('leaveFormMsg');
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    if (!startDate || !endDate) { showMsg(msg, 'Please select both start and end dates.', 'error'); return; }
    
    btn.disabled = true; btn.textContent = 'SUBMITTING...';
    msg.style.display = 'none';
    try {
        await api('/api/employee/leave-request', {
            method: 'POST',
            body: JSON.stringify({
                leave_type: document.getElementById('leaveType').value,
                start_date: startDate,
                end_date: endDate,
                reason: document.getElementById('leaveReason').value
            })
        });
        showMsg(msg, '✅ Leave request submitted! Super Admin will review shortly.', 'success');
        document.getElementById('leaveReason').value = '';
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        
        await loadProfile();
        syncLeaveBalancesForm();
        await loadLeaves();
        showToast('Leave request submitted!', 'success');
    } catch (e) {
        showMsg(msg, '✕ ' + e.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '✉ SUBMIT REQUEST';
    }
}

function syncLeaveBalancesForm() {
    if (!profile) return;
    const fAnnual = document.getElementById('formAnnualBal');
    const fSick = document.getElementById('formSickBal');
    const fEmerg = document.getElementById('formEmergBal');
    
    if (fAnnual) fAnnual.textContent = profile.annual_leave_balance;
    if (fSick) fSick.textContent = profile.sick_leave_balance;
    if (fEmerg) fEmerg.textContent = profile.emergency_leave_balance;
    
    const barAnnual = document.getElementById('formAnnualBar');
    const barSick = document.getElementById('formSickBar');
    const barEmerg = document.getElementById('formEmergBar');
    
    if (barAnnual) barAnnual.style.width = Math.round((profile.annual_leave_balance / 15) * 100) + '%';
    if (barSick) barSick.style.width = Math.round((profile.sick_leave_balance / 10) * 100) + '%';
    if (barEmerg) barEmerg.style.width = Math.round((profile.emergency_leave_balance / 5) * 100) + '%';
}

function showMsg(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.color = type === 'success' ? '#00ff64' : '#ff0000';
}

// ── Utils ─────────────────────────────────────────────
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function fmtDate(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
function fmtTimePart(iso) { if (!iso) return '—'; return new Date(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }); }
function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.className = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3500);
}
function logout() {
    stopElapsedTimer();
    ['emp_token','emp_name','emp_email'].forEach(k => sessionStorage.removeItem(k));
    window.location.href = 'employee-login.html';
}
