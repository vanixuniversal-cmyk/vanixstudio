import os

base_dir = r"c:\xampp\htdocs\vanixstudio"

# 1. Update super-admin.src.html
sa_path = os.path.join(base_dir, "pages", "super-admin.src.html")
with open(sa_path, "r", encoding="utf-8") as f:
    sa_html = f.read()

# Add to sidebar
sa_nav_item = """                <button class="nav-item" data-section="training" onclick="showSection('training')">
                    <span class="nav-icon">🎓</span> TRAINING PORTAL
                </button>"""
sa_new_nav_item = """                <button class="nav-item" data-section="training" onclick="showSection('training')">
                    <span class="nav-icon">🎓</span> TRAINING PORTAL
                </button>
                <button class="nav-item" data-section="task-marketplace" onclick="showSection('task-marketplace')">
                    <span class="nav-icon">💼</span> TASK MARKETPLACE
                </button>"""
if 'data-section="task-marketplace"' not in sa_html:
    sa_html = sa_html.replace(sa_nav_item, sa_new_nav_item)

# Add section
sa_section = """            </section>

        </main>"""
sa_new_section = """            </section>

            <!-- ══ SECTION: Task Marketplace ══ -->
            <section class="content-section" id="section-task-marketplace">
                <div class="overview-grid" style="display: block;">
                    <div class="panel">
                        <div class="panel-header" style="display: flex; gap: 15px; border-bottom: 1px solid var(--border); padding-bottom: 0;">
                            <button class="tab-btn active" data-target="tm-create" onclick="switchTmTab('tm-create')" style="padding: 15px 20px; background: transparent; color: var(--text-dim); border: none; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 600; font-family: 'Poppins', sans-serif;">Create Task</button>
                            <button class="tab-btn" data-target="tm-manage" onclick="switchTmTab('tm-manage')" style="padding: 15px 20px; background: transparent; color: var(--text-dim); border: none; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 600; font-family: 'Poppins', sans-serif;">Manage Tasks</button>
                            <button class="tab-btn" data-target="tm-bids" onclick="switchTmTab('tm-bids')" style="padding: 15px 20px; background: transparent; color: var(--text-dim); border: none; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 600; font-family: 'Poppins', sans-serif;">Review Bids</button>
                            <button class="tab-btn" data-target="tm-analytics" onclick="switchTmTab('tm-analytics')" style="padding: 15px 20px; background: transparent; color: var(--text-dim); border: none; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 600; font-family: 'Poppins', sans-serif;">Task Analytics</button>
                        </div>
                        
                        <style>
                            .tab-btn.active { color: var(--primary) !important; border-bottom-color: var(--primary) !important; }
                            .tm-panel { display: none; padding: 25px; }
                            .tm-panel.active { display: block; animation: fadeIn 0.3s ease; }
                            .tm-status-badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
                        </style>

                        <!-- TAB 1: CREATE TASK -->
                        <div id="tm-create" class="tm-panel active">
                            <h2 class="panel-title" style="margin-bottom: 20px;">💼 POST A NEW TASK</h2>
                            <form id="createTaskForm" onsubmit="handleCreateTask(event)" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div style="grid-column: span 2;">
                                    <label style="color: var(--text-dim); font-size: 12px; display:block; margin-bottom:5px;">Task Title</label>
                                    <input type="text" class="bulletin-input" id="ct_title" style="width: 100%;" required>
                                </div>
                                <div style="grid-column: span 2;">
                                    <label style="color: var(--text-dim); font-size: 12px; display:block; margin-bottom:5px;">Description</label>
                                    <textarea class="bulletin-input" id="ct_desc" style="width: 100%; min-height: 100px; resize:vertical; padding:10px;" required></textarea>
                                </div>
                                <div>
                                    <label style="color: var(--text-dim); font-size: 12px; display:block; margin-bottom:5px;">Required Skills</label>
                                    <input type="text" class="bulletin-input" id="ct_skills" style="width: 100%;" placeholder="e.g. React, UI/UX" required>
                                </div>
                                <div>
                                    <label style="color: var(--text-dim); font-size: 12px; display:block; margin-bottom:5px;">Category</label>
                                    <select class="bulletin-input" id="ct_category" style="width: 100%; padding:10px;" required>
                                        <option value="Frontend">Frontend</option><option value="Backend">Backend</option><option value="Design">Design</option><option value="VFX">VFX</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="color: var(--text-dim); font-size: 12px; display:block; margin-bottom:5px;">Difficulty</label>
                                    <select class="bulletin-input" id="ct_difficulty" style="width: 100%; padding:10px;" required>
                                        <option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="color: var(--text-dim); font-size: 12px; display:block; margin-bottom:5px;">Deadline</label>
                                    <input type="date" class="bulletin-input" id="ct_deadline" style="width: 100%;" required>
                                </div>
                                <div>
                                    <label style="color: var(--text-dim); font-size: 12px; display:block; margin-bottom:5px;">Budget (₹ Optional)</label>
                                    <input type="number" class="bulletin-input" id="ct_budget" style="width: 100%;">
                                </div>
                                <div>
                                    <label style="color: var(--text-dim); font-size: 12px; display:block; margin-bottom:5px;">Priority</label>
                                    <select class="bulletin-input" id="ct_priority" style="width: 100%; padding:10px;" required>
                                        <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                                    </select>
                                </div>
                                <div style="grid-column: span 2; margin-top:10px;">
                                    <button type="submit" class="submit-btn" style="padding: 12px 30px; font-size: 14px; width: 100%;">+ POST TASK (OPEN FOR BIDDING)</button>
                                </div>
                            </form>
                        </div>

                        <!-- TAB 2: MANAGE TASKS -->
                        <div id="tm-manage" class="tm-panel">
                            <div class="table-wrap">
                                <table class="data-table">
                                    <thead>
                                        <tr><th>Task</th><th>Difficulty</th><th>Deadline</th><th>Status</th><th>Total Bids</th><th>Assigned To</th><th>Actions</th></tr>
                                    </thead>
                                    <tbody id="tmManageTable">
                                        <!-- JS injected -->
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- TAB 3: REVIEW BIDS -->
                        <div id="tm-bids" class="tm-panel">
                            <div style="margin-bottom: 20px;">
                                <label style="color: var(--text-dim); font-size: 12px; display:block; margin-bottom:5px;">Select Task to Review Bids</label>
                                <select class="bulletin-input" id="reviewBidTaskSelect" onchange="loadBidsForTask()" style="width: 100%; max-width: 400px; padding: 10px;">
                                    <option value="">-- Select an Open Task --</option>
                                </select>
                            </div>
                            <div class="table-wrap">
                                <table class="data-table">
                                    <thead>
                                        <tr><th>Student</th><th>Bid Amount</th><th>Delivery</th><th>Completed</th><th>Success</th><th>Rating</th><th>Actions</th></tr>
                                    </thead>
                                    <tbody id="tmBidsTable">
                                        <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding:20px;">Select a task to review bids.</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- TAB 4: TASK ANALYTICS -->
                        <div id="tm-analytics" class="tm-panel">
                            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 30px;">
                                <div class="stat-card" style="padding: 20px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); text-align: center;">
                                    <div style="font-size: 28px; color: var(--primary); font-weight: bold; font-family:'Orbitron',sans-serif;" id="ana_total">0</div>
                                    <div style="font-size: 12px; color: var(--text-dim); margin-top:5px;">Total Tasks</div>
                                </div>
                                <div class="stat-card" style="padding: 20px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); text-align: center;">
                                    <div style="font-size: 28px; color: var(--primary); font-weight: bold; font-family:'Orbitron',sans-serif;" id="ana_open">0</div>
                                    <div style="font-size: 12px; color: var(--text-dim); margin-top:5px;">Open Tasks</div>
                                </div>
                                <div class="stat-card" style="padding: 20px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); text-align: center;">
                                    <div style="font-size: 28px; color: var(--primary); font-weight: bold; font-family:'Orbitron',sans-serif;" id="ana_assigned">0</div>
                                    <div style="font-size: 12px; color: var(--text-dim); margin-top:5px;">Assigned</div>
                                </div>
                                <div class="stat-card" style="padding: 20px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); text-align: center;">
                                    <div style="font-size: 28px; color: var(--primary); font-weight: bold; font-family:'Orbitron',sans-serif;" id="ana_completed">0</div>
                                    <div style="font-size: 12px; color: var(--text-dim); margin-top:5px;">Completed</div>
                                </div>
                                <div class="stat-card" style="padding: 20px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); text-align: center;">
                                    <div style="font-size: 28px; color: var(--primary); font-weight: bold; font-family:'Orbitron',sans-serif;" id="ana_bids">0</div>
                                    <div style="font-size: 12px; color: var(--text-dim); margin-top:5px;">Total Bids</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 20px;">
                                <div class="stat-card" style="flex: 1; padding: 20px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius);">
                                    <h4 style="color:var(--text-dim); font-size:14px; text-align:center;">Tasks Created Per Week</h4>
                                    <div style="height: 150px; display: flex; align-items: flex-end; justify-content: center; gap: 15px; margin-top: 20px;">
                                        <div style="width: 35px; height: 40%; background: var(--red-glow); border-radius: 4px 4px 0 0;"></div>
                                        <div style="width: 35px; height: 60%; background: var(--red-glow); border-radius: 4px 4px 0 0;"></div>
                                        <div style="width: 35px; height: 30%; background: var(--red-glow); border-radius: 4px 4px 0 0;"></div>
                                        <div style="width: 35px; height: 80%; background: var(--primary); border-radius: 4px 4px 0 0;"></div>
                                    </div>
                                </div>
                                <div class="stat-card" style="flex: 1; padding: 20px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius);">
                                    <h4 style="color:var(--text-dim); font-size:14px; text-align:center;">Completed Tasks Per Week</h4>
                                    <div style="height: 150px; display: flex; align-items: flex-end; justify-content: center; gap: 15px; margin-top: 20px;">
                                        <div style="width: 35px; height: 20%; background: rgba(0,230,118,0.3); border-radius: 4px 4px 0 0;"></div>
                                        <div style="width: 35px; height: 50%; background: rgba(0,230,118,0.3); border-radius: 4px 4px 0 0;"></div>
                                        <div style="width: 35px; height: 40%; background: rgba(0,230,118,0.3); border-radius: 4px 4px 0 0;"></div>
                                        <div style="width: 35px; height: 90%; background: #00E676; border-radius: 4px 4px 0 0;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </main>"""

if 'id="section-task-marketplace"' not in sa_html:
    sa_html = sa_html.replace(sa_section, sa_new_section)

with open(sa_path, "w", encoding="utf-8") as f:
    f.write(sa_html)

# 2. Update training-dashboard.src.html
td_path = os.path.join(base_dir, "pages", "training-dashboard.src.html")
with open(td_path, "r", encoding="utf-8") as f:
    td_html = f.read()

# Add to sidebar menu
td_menu = """                <button class="menu-item" id="menu-downloads" onclick="switchDashboardTab('downloads')">
                    <span class="menu-item-icon">📥</span> Study Materials
                </button>"""
td_new_menu = """                <button class="menu-item" id="menu-downloads" onclick="switchDashboardTab('downloads')">
                    <span class="menu-item-icon">📥</span> Study Materials
                </button>
                <button class="menu-item" id="menu-tasks" onclick="switchDashboardTab('tasks')">
                    <span class="menu-item-icon">💼</span> Task Marketplace
                </button>"""
if 'onclick="switchDashboardTab(\'tasks\')"' not in td_html:
    td_html = td_html.replace(td_menu, td_new_menu)

# Replace earnings section
td_earnings_start = """                    <!-- Statistics row -->
                    <div class="stats-grid">"""
td_earnings_end = """                    <!-- Active & Completed Tasks Split -->
                    <div class="analytics-grid-two" style="margin-top: 20px;">"""

new_earnings_html = """                    <!-- Student Earnings & Task Metrics -->
                    <div class="stats-grid" id="stuEarningsGrid">
                        <div class="stat-card">
                            <div class="stat-icon" style="background: rgba(0, 255, 136, 0.08); border-color: rgba(0, 255, 136, 0.2); color: #00E676;">₹</div>
                            <div class="stat-details">
                                <span class="stat-val" id="stuTotalEarnings">₹0.00</span>
                                <span class="stat-label">Total Earnings</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon streak"><span>✅</span></div>
                            <div class="stat-details">
                                <span class="stat-val" id="stuCompletedTasks">0</span>
                                <span class="stat-label">Completed Tasks</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon hours"><span>⏳</span></div>
                            <div class="stat-details">
                                <span class="stat-val" id="stuActiveTasks">0</span>
                                <span class="stat-label">Active Tasks</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon live" style="background: rgba(255, 214, 0, 0.08); border-color: rgba(255, 214, 0, 0.2); color: #FFD600;"><span>⌛</span></div>
                            <div class="stat-details">
                                <span class="stat-val" id="stuPendingApproval">0</span>
                                <span class="stat-label">Pending Approval</span>
                            </div>
                        </div>
                    </div>

                    <div class="analytics-grid-two" style="margin-bottom: 20px;">
                        <!-- Recent Transactions -->
                        <div class="chart-panel">
                            <div class="chart-header" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px; margin-bottom: 15px;">
                                <h3 class="chart-title">Recent Transactions</h3>
                            </div>
                            <table style="width: 100%; text-align: left; font-size: 12px;">
                                <thead>
                                    <tr style="color: var(--text-dim); border-bottom: 1px solid rgba(255,255,255,0.05);">
                                        <th style="padding: 10px 5px;">Task</th><th style="padding: 10px 5px;">Amount</th><th style="padding: 10px 5px;">Date</th><th style="padding: 10px 5px;">Status</th>
                                    </tr>
                                </thead>
                                <tbody id="stuTransactionsTable">
                                    <tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-dim);">No transactions yet.</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Leaderboard -->
                        <div class="chart-panel">
                            <div class="chart-header" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px; margin-bottom: 15px;">
                                <h3 class="chart-title">Global Leaderboard (Top 10)</h3>
                            </div>
                            <table style="width: 100%; text-align: left; font-size: 12px;">
                                <thead>
                                    <tr style="color: var(--text-dim); border-bottom: 1px solid rgba(255,255,255,0.05);">
                                        <th style="padding: 10px 5px;">Rank</th><th style="padding: 10px 5px;">Student</th><th style="padding: 10px 5px;">Points</th><th style="padding: 10px 5px;">Completed</th>
                                    </tr>
                                </thead>
                                <tbody id="stuLeaderboardTable">
                                    <!-- Populated by JS -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Active & Completed Tasks Split -->
                    <div class="analytics-grid-two" style="margin-top: 20px; display: none;">"""

if 'id="stuEarningsGrid"' not in td_html:
    parts = td_html.split(td_earnings_start)
    if len(parts) == 2:
        parts2 = parts[1].split(td_earnings_end)
        if len(parts2) == 2:
            td_html = parts[0] + new_earnings_html + parts2[1]

# Add VIEW 5: TASK MARKETPLACE before </main>
td_view_task = """            <!-- VIEW 5: TASK MARKETPLACE -->
            <section class="dashboard-view-panel" id="view-tasks">
                <div class="overview-panel">
                    
                    <div class="view-title-row">
                        <h2 class="view-title">TASK <span>MARKETPLACE</span></h2>
                        <div style="display: flex; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 25px; padding-bottom: 0;">
                            <button class="stu-tab-btn active" data-target="stu-tasks-avail" onclick="switchStuTmTab('stu-tasks-avail')">Available Tasks</button>
                            <button class="stu-tab-btn" data-target="stu-tasks-bids" onclick="switchStuTmTab('stu-tasks-bids')">My Bids</button>
                            <button class="stu-tab-btn" data-target="stu-tasks-assigned" onclick="switchStuTmTab('stu-tasks-assigned')">Assigned Tasks</button>
                        </div>
                    </div>
                    
                    <style>
                        .stu-tab-btn { padding: 10px 20px; background: transparent; color: var(--text-dim); border: none; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 600; font-family: 'Poppins', sans-serif; font-size: 13px; }
                        .stu-tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
                        .stu-tm-panel { display: none; }
                        .stu-tm-panel.active { display: block; animation: fadeIn 0.3s ease; }
                        .tm-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; transition: transform 0.2s, border-color 0.2s; }
                        .tm-card:hover { border-color: var(--primary); transform: translateY(-3px); }
                        .tm-card-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #fff; font-family: 'Orbitron', sans-serif; }
                        .tm-card-desc { font-size: 12px; color: var(--text-dim); line-height: 1.5; margin-bottom: 15px; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
                        .tm-meta-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; margin-top: auto; }
                        
                        /* Modal UI */
                        .tm-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
                        .tm-modal-overlay.active { display: flex; animation: fadeIn 0.2s; }
                        .tm-modal-card { background: #0d0d0d; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; width: 100%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                        .tm-modal-header { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
                        .tm-modal-header h2 { font-size: 18px; font-family: 'Orbitron', sans-serif; }
                        .tm-close-btn { background: none; border: none; color: var(--text-dim); font-size: 20px; cursor: pointer; }
                        .tm-modal-body { padding: 24px; overflow-y: auto; flex: 1; }
                        .tm-modal-footer { padding: 20px 24px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: flex-end; gap: 12px; background: #050505; border-radius: 0 0 12px 12px; }
                        
                        .tm-badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: var(--text-dim); }
                        .tm-badge.diff-beginner { color: #00E676; border-color: rgba(0,230,118,0.3); background: rgba(0,230,118,0.1); }
                        .tm-badge.diff-intermediate { color: #FFD600; border-color: rgba(255,214,0,0.3); background: rgba(255,214,0,0.1); }
                        .tm-badge.diff-advanced { color: #FF1744; border-color: rgba(255,23,68,0.3); background: rgba(255,23,68,0.1); }
                        .tm-skill { font-size: 11px; padding: 3px 8px; background: rgba(255,255,255,0.05); border-radius: 12px; margin-right: 5px; margin-bottom: 5px; display: inline-block; color: #ccc; }
                    </style>

                    <!-- TAB: Available Tasks -->
                    <div id="stu-tasks-avail" class="stu-tm-panel active">
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;" id="stuAvailGrid">
                            <!-- JS injected -->
                        </div>
                    </div>

                    <!-- TAB: My Bids -->
                    <div id="stu-tasks-bids" class="stu-tm-panel">
                        <div class="chart-panel">
                            <table style="width: 100%; text-align: left; font-size: 13px;">
                                <thead>
                                    <tr style="color: var(--text-dim); border-bottom: 1px solid rgba(255,255,255,0.05);">
                                        <th style="padding: 12px 10px;">Task Name</th><th style="padding: 12px 10px;">Bid Amount</th><th style="padding: 12px 10px;">Delivery Time</th><th style="padding: 12px 10px;">Status</th>
                                    </tr>
                                </thead>
                                <tbody id="stuBidsTable">
                                    <tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-dim);">No bids placed yet.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- TAB: Assigned Tasks -->
                    <div id="stu-tasks-assigned" class="stu-tm-panel">
                        <div class="chart-panel" style="padding: 0;">
                            <table style="width: 100%; text-align: left; font-size: 13px;">
                                <thead>
                                    <tr style="color: var(--text-dim); border-bottom: 1px solid rgba(255,255,255,0.05);">
                                        <th style="padding: 15px 20px;">Task Name</th><th style="padding: 15px 20px;">Due Date</th><th style="padding: 15px 20px;">Status</th><th style="padding: 15px 20px; text-align: right;">Action</th>
                                    </tr>
                                </thead>
                                <tbody id="stuAssignedTable">
                                    <tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--text-dim);">No tasks assigned.</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- MODAL: Task Details (Student) -->
            <div class="tm-modal-overlay" id="taskDetailModal">
                <div class="tm-modal-card">
                    <div class="tm-modal-header">
                        <h2 id="tdModalTitle">Task Title</h2>
                        <button class="tm-close-btn" onclick="closeTmModal('taskDetailModal')">✕</button>
                    </div>
                    <div class="tm-modal-body">
                        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                            <div>
                                <span class="tm-badge" id="tdModalDiff">Beginner</span>
                                <span class="tm-badge" style="margin-left:5px;" id="tdModalDeadline">Deadline: 3 Days</span>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase;">Current Lowest Bid</div>
                                <div style="font-size:16px; font-weight:bold; color:var(--primary);" id="tdModalLowestBid">₹0</div>
                            </div>
                        </div>
                        <h4 style="font-size:12px; color:var(--text-dim); margin-bottom:5px; text-transform:uppercase;">Description</h4>
                        <p id="tdModalDesc" style="font-size:13px; line-height:1.6; color:#ccc; margin-bottom:20px; white-space:pre-wrap;"></p>
                        
                        <h4 style="font-size:12px; color:var(--text-dim); margin-bottom:5px; text-transform:uppercase;">Required Skills</h4>
                        <div id="tdModalSkills" style="margin-bottom:20px;"></div>
                        
                        <h4 style="font-size:12px; color:var(--text-dim); margin-bottom:5px; text-transform:uppercase;">Attachments</h4>
                        <div id="tdModalAttachments" style="font-size:13px; color:#ccc; margin-bottom:20px;">No attachments.</div>
                    </div>
                    <div class="tm-modal-footer">
                        <button class="resume-learning-btn" style="background:transparent; border:1px solid rgba(255,255,255,0.2);" onclick="closeTmModal('taskDetailModal')">Cancel</button>
                        <button class="resume-learning-btn" onclick="openBidModal()">Place Bid</button>
                    </div>
                </div>
            </div>

            <!-- MODAL: Submit Bid -->
            <div class="tm-modal-overlay" id="submitBidModal">
                <div class="tm-modal-card">
                    <div class="tm-modal-header">
                        <h2>Submit Proposal</h2>
                        <button class="tm-close-btn" onclick="closeTmModal('submitBidModal')">✕</button>
                    </div>
                    <div class="tm-modal-body">
                        <form id="bidForm" onsubmit="handleStudentBid(event)">
                            <div style="margin-bottom:15px;">
                                <label style="font-size:12px; color:var(--text-dim); display:block; margin-bottom:5px;">Bid Amount (₹)</label>
                                <input type="number" id="bid_amt" class="memo-scratchpad" style="width:100%; min-height:auto; padding:10px;" required>
                            </div>
                            <div style="margin-bottom:15px;">
                                <label style="font-size:12px; color:var(--text-dim); display:block; margin-bottom:5px;">Delivery Time (Days)</label>
                                <input type="number" id="bid_time" class="memo-scratchpad" style="width:100%; min-height:auto; padding:10px;" required min="1">
                            </div>
                            <div style="margin-bottom:15px;">
                                <label style="font-size:12px; color:var(--text-dim); display:block; margin-bottom:5px;">Proposal Message</label>
                                <textarea id="bid_msg" class="memo-scratchpad" style="width:100%; min-height:100px; padding:10px;" required placeholder="Why are you a good fit?"></textarea>
                            </div>
                            <div style="text-align:right; margin-top:20px;">
                                <button type="button" class="resume-learning-btn" style="background:transparent; border:1px solid rgba(255,255,255,0.2); margin-right:10px;" onclick="closeTmModal('submitBidModal')">Cancel</button>
                                <button type="submit" class="resume-learning-btn">Submit Bid</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- MODAL: Task Submission -->
            <div class="tm-modal-overlay" id="taskSubmissionModal">
                <div class="tm-modal-card">
                    <div class="tm-modal-header">
                        <h2>Submit Assigned Task</h2>
                        <button class="tm-close-btn" onclick="closeTmModal('taskSubmissionModal')">✕</button>
                    </div>
                    <div class="tm-modal-body">
                        <form id="submissionForm" onsubmit="handleStudentSubmission(event)">
                            <div style="margin-bottom:15px;">
                                <label style="font-size:12px; color:var(--text-dim); display:block; margin-bottom:5px;">File Upload (Optional)</label>
                                <input type="file" id="sub_file" style="color:#ccc; font-size:13px;">
                            </div>
                            <div style="margin-bottom:15px;">
                                <label style="font-size:12px; color:var(--text-dim); display:block; margin-bottom:5px;">GitHub URL (Optional)</label>
                                <input type="url" id="sub_github" class="memo-scratchpad" style="width:100%; min-height:auto; padding:10px;" placeholder="https://github.com/...">
                            </div>
                            <div style="margin-bottom:15px;">
                                <label style="font-size:12px; color:var(--text-dim); display:block; margin-bottom:5px;">Demo URL (Optional)</label>
                                <input type="url" id="sub_demo" class="memo-scratchpad" style="width:100%; min-height:auto; padding:10px;" placeholder="https://...">
                            </div>
                            <div style="margin-bottom:15px;">
                                <label style="font-size:12px; color:var(--text-dim); display:block; margin-bottom:5px;">Notes</label>
                                <textarea id="sub_notes" class="memo-scratchpad" style="width:100%; min-height:80px; padding:10px;" placeholder="Explain what you have built..."></textarea>
                            </div>
                            <div style="text-align:right; margin-top:20px;">
                                <button type="button" class="resume-learning-btn" style="background:transparent; border:1px solid rgba(255,255,255,0.2); margin-right:10px;" onclick="closeTmModal('taskSubmissionModal')">Cancel</button>
                                <button type="submit" class="resume-learning-btn" style="background:#00E676; color:#000;">Submit Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

        </main>"""

if 'id="view-tasks"' not in td_html:
    td_html = td_html.replace('        </main>', td_view_task)

with open(td_path, "w", encoding="utf-8") as f:
    f.write(td_html)

print("HTML modifications applied.")
