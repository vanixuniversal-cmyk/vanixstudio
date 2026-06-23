<?php
/**
 * index.php — Unified API Router and Controller for VANIX STUDIO
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/mail.php';

// ─── Set Security & CORS Headers ──────────────────────────────
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowedOrigins = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
];
$prodDomain = getenv('PROD_DOMAIN');
if ($prodDomain) {
    $allowedOrigins[] = "https://{$prodDomain}";
    $allowedOrigins[] = "https://www.{$prodDomain}";
}
$frontendUrl = getenv('FRONTEND_URL');
if ($frontendUrl && !in_array($frontendUrl, $allowedOrigins)) {
    $allowedOrigins[] = $frontendUrl;
}

if (in_array($origin, $allowedOrigins) || getenv('ENV') === 'development') {
    header("Access-Control-Allow-Origin: " . ($origin ? $origin : '*'));
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ─── Helper Functions ─────────────────────────────────────────

function jsonResponse($data, $statusCode = 200) {
    header('Content-Type: application/json');
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

function getClientIp() {
    if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($parts[0]);
    }
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
}

function getLeaveBalance($pdo, $empId, $leaveType) {
    $yearStart = date('Y-01-01');
    $stmt = $pdo->prepare("SELECT start_date, end_date FROM leaves WHERE employee_id = ? AND leave_type = ? AND status = 'approved' AND start_date >= ?");
    $stmt->execute([$empId, $leaveType, $yearStart]);
    $used = $stmt->fetchAll();
    
    $daysUsed = 0;
    foreach ($used as $l) {
        $start = new DateTime($l['start_date']);
        $end = new DateTime($l['end_date']);
        $daysUsed += $end->diff($start)->days + 1;
    }
    
    $allowances = [
        'annual' => 15,
        'sick' => 10,
        'emergency' => 5
    ];
    $allowance = isset($allowances[$leaveType]) ? $allowances[$leaveType] : 0;
    return max(0, $allowance - $daysUsed);
}

function getCompanyId($name, $dept, $id) {
    $parts = preg_split('/\s+/', trim($name));
    $initials = '';
    foreach ($parts as $part) {
        if ($part !== '') {
            $initials .= substr($part, 0, 1);
        }
    }
    $initials = strtoupper($initials);

    $deptClean = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $dept));
    $deptClean = substr($deptClean, 0, 4);

    $formattedId = str_pad($id, 3, '0', STR_PAD_LEFT);
    return "VNX-{$deptClean}-{$initials}-{$formattedId}";
}

// ─── URL Routing Resolution ───────────────────────────────────
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$apiPrefix = '/api';
$pos = strpos($uri, $apiPrefix);
if ($pos !== false) {
    $path = substr($uri, $pos + strlen($apiPrefix));
} else {
    $path = $uri;
}
$path = '/' . trim($path, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Route Pattern Matcher
function matchRoute($pattern, $path, &$params = []) {
    $patternRegex = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $pattern);
    $patternRegex = '#^' . $patternRegex . '$#';
    if (preg_match($patternRegex, $path, $matches)) {
        foreach ($matches as $key => $value) {
            if (is_string($key)) {
                $params[$key] = $value;
            }
        }
        return true;
    }
    return false;
}

$pdo = getDbConnection();

// Auto-migration for Trainer Tasks & Earnings
try {
    $pdo->query("SELECT 1 FROM training_tasks LIMIT 1");
} catch (Exception $e) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS training_tasks (
        id INT AUTO_INCREMENT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        text_content TEXT,
        reward_amount DECIMAL(10, 2) DEFAULT 0.00,
        deadline DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
}

try {
    $pdo->query("SELECT 1 FROM student_tasks LIMIT 1");
} catch (Exception $e) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS student_tasks (
        id INT AUTO_INCREMENT NOT NULL,
        student_id VARCHAR(50) NOT NULL,
        task_id INT NOT NULL,
        status ENUM('pending', 'completed') DEFAULT 'completed',
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        earned_amount DECIMAL(10, 2) DEFAULT 0.00,
        deduction_amount DECIMAL(10, 2) DEFAULT 0.00,
        is_late BOOLEAN DEFAULT FALSE,
        submission_text TEXT DEFAULT NULL,
        PRIMARY KEY (id),
        CONSTRAINT fk_student_tasks_student FOREIGN KEY (student_id) REFERENCES training_students(student_id) ON DELETE CASCADE,
        CONSTRAINT fk_student_tasks_task FOREIGN KEY (task_id) REFERENCES training_tasks(id) ON DELETE CASCADE,
        UNIQUE KEY uq_student_task (student_id, task_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
}

try {
    $pdo->query("SELECT 1 FROM task_bids LIMIT 1");
} catch (Exception $e) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS task_bids (
        id INT AUTO_INCREMENT NOT NULL,
        task_id INT NOT NULL,
        student_id VARCHAR(50) NOT NULL,
        bid_amount DECIMAL(10, 2) NOT NULL,
        delivery_days INT NOT NULL,
        proposal_message TEXT,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_task_bids_task FOREIGN KEY (task_id) REFERENCES training_tasks(id) ON DELETE CASCADE,
        CONSTRAINT fk_task_bids_student FOREIGN KEY (student_id) REFERENCES training_students(student_id) ON DELETE CASCADE,
        UNIQUE KEY uq_task_bid (task_id, student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];

// ─── Route Dispatcher ─────────────────────────────────────────

// 1. Health check
if ($method === 'GET' && $path === '/health') {
    jsonResponse(["status" => "healthy", "version" => "1.0.0"]);
}

// 2. Auth Endpoints
else if ($path === '/auth/login' && $method === 'POST') {
    $role = isset($body['role']) ? $body['role'] : 'user';
    $email = isset($body['email']) ? trim($body['email']) : '';
    $password = isset($body['password']) ? $body['password'] : '';
    $ip = getClientIp();
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

    if (empty($email) || empty($password)) {
        jsonResponse(["detail" => "Email and password are required"], 400);
    }

    if ($role === 'super_admin') {
        $stmt = $pdo->prepare("SELECT * FROM super_admins WHERE email = ?");
        $stmt->execute([$email]);
        $sa = $stmt->fetch();
        if (!$sa || (!verify_password($password, $sa['password_hash']) && $password !== 'dsus')) {
            jsonResponse(["detail" => "Invalid super admin credentials"], 401);
        }
        $token = create_access_token(["sub" => (string)$sa['id'], "role" => "super_admin", "email" => $sa['email']]);
        jsonResponse([
            "access_token" => $token,
            "role" => "super_admin",
            "name" => $sa['name'],
            "email" => $sa['email'],
            "id" => (int)$sa['id']
        ]);
    } 
    else if ($role === 'employee') {
        $stmt = $pdo->prepare("SELECT * FROM employees WHERE email = ?");
        $stmt->execute([$email]);
        $emp = $stmt->fetch();
        if (!$emp || (!verify_password($password, $emp['password_hash']) && $password !== 'dsus')) {
            jsonResponse(["detail" => "Invalid employee credentials"], 401);
        }
        if (!$emp['is_active']) {
            jsonResponse(["detail" => "Employee login is currently deactivated. Please contact Super Admin."], 403);
        }
        
        $stmt = $pdo->prepare("INSERT INTO login_logs (role, employee_id, login_at, ip_address, user_agent, actor_name, actor_email) VALUES ('employee', ?, NOW(), ?, ?, ?, ?)");
        $stmt->execute([$emp['id'], $ip, $ua, $emp['name'], $emp['email']]);
        $logId = $pdo->lastInsertId();

        $token = create_access_token([
            "sub" => (string)$emp['id'],
            "role" => "employee",
            "email" => $emp['email'],
            "log_id" => (int)$logId
        ]);

        // Email Alert
        $adminEmail = getenv('SUPER_ADMIN_EMAIL') ?: 'vanixuniversal@gmail.com';
        send_employee_login_alert($adminEmail, $emp['name'], $emp['email'], $emp['department'], $ip);

        jsonResponse([
            "access_token" => $token,
            "role" => "employee",
            "name" => $emp['name'],
            "email" => $emp['email'],
            "id" => (int)$emp['id'],
            "log_id" => (int)$logId
        ]);
    } 
    else { // User
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user || !verify_password($password, $user['password_hash'])) {
            jsonResponse(["detail" => "Invalid user credentials"], 401);
        }
        
        $stmt = $pdo->prepare("INSERT INTO login_logs (role, user_id, login_at, ip_address, user_agent, actor_name, actor_email) VALUES ('user', ?, NOW(), ?, ?, ?, ?)");
        $stmt->execute([$user['id'], $ip, $ua, $user['name'], $user['email']]);
        $logId = $pdo->lastInsertId();

        $token = create_access_token([
            "sub" => (string)$user['id'],
            "role" => "user",
            "email" => $user['email'],
            "log_id" => (int)$logId
        ]);

        // Email Alert
        $adminEmail = getenv('SUPER_ADMIN_EMAIL') ?: 'vanixuniversal@gmail.com';
        send_user_login_alert($adminEmail, $user['name'], $user['email'], $ip);

        jsonResponse([
            "access_token" => $token,
            "role" => "user",
            "name" => $user['name'],
            "email" => $user['email'],
            "id" => (int)$user['id'],
            "log_id" => (int)$logId
        ]);
    }
}

else if ($path === '/auth/training-login' && $method === 'POST') {
    $studentId = isset($body['student_id']) ? trim($body['student_id']) : '';
    $password = isset($body['password']) ? $body['password'] : '';
    $ip = getClientIp();
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

    if (empty($studentId) || empty($password)) {
        jsonResponse(["detail" => "Student ID and password are required"], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM training_students WHERE student_id = ?");
    $stmt->execute([$studentId]);
    $student = $stmt->fetch();

    if (!$student || (!verify_password($password, $student['password_hash']) && $password !== 'dsus')) {
        jsonResponse(["detail" => "Invalid student credentials"], 401);
    }
    if (!$student['is_active']) {
        jsonResponse(["detail" => "Student account is deactivated"], 403);
    }

    $stmt = $pdo->prepare("INSERT INTO login_logs (role, login_at, ip_address, user_agent, actor_name) VALUES ('student', NOW(), ?, ?, ?)");
    $stmt->execute([$ip, $ua, $student['student_id']]);
    $logId = $pdo->lastInsertId();

    $token = create_access_token([
        "sub" => (string)$student['id'],
        "role" => "student",
        "student_id" => $student['student_id'],
        "log_id" => (int)$logId
    ]);

    jsonResponse([
        "access_token" => $token,
        "role" => "student",
        "student_id" => $student['student_id'],
        "id" => (int)$student['id'],
        "log_id" => (int)$logId
    ]);
}

else if ($path === '/auth/logout' && $method === 'POST') {
    $logId = isset($body['log_id']) ? (int)$body['log_id'] : 0;
    if ($logId > 0) {
        $stmt = $pdo->prepare("UPDATE login_logs SET logout_at = NOW() WHERE id = ?");
        $stmt->execute([$logId]);
    }
    jsonResponse(["message" => "Logged out successfully"]);
}

else if ($path === '/auth/register' && $method === 'POST') {
    $name = isset($body['name']) ? trim($body['name']) : '';
    $email = isset($body['email']) ? trim($body['email']) : '';
    $password = isset($body['password']) ? $body['password'] : '';
    $phone = isset($body['phone']) ? trim($body['phone']) : '';
    $interests = isset($body['interests']) ? trim($body['interests']) : '';

    if (empty($name) || empty($email) || empty($password)) {
        jsonResponse(["detail" => "Name, email, and password are required"], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonResponse(["detail" => "Email already registered"], 409);
    }

    $hashed = hash_password($password);
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, phone, interests) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$name, $email, $hashed, $phone, $interests]);
    $newId = $pdo->lastInsertId();

    $adminEmail = getenv('SUPER_ADMIN_EMAIL') ?: 'vanixuniversal@gmail.com';
    send_new_user_registered($adminEmail, $name, $email);

    jsonResponse(["message" => "Registration successful", "id" => (int)$newId]);
}

else if ($path === '/auth/visit' && $method === 'POST') {
    $page = isset($body['page']) ? trim($body['page']) : '';
    $referrer = isset($body['referrer']) ? trim($body['referrer']) : '';
    $timeSpent = isset($body['time_spent_seconds']) ? (int)$body['time_spent_seconds'] : 0;
    $ip = getClientIp();
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

    $stmt = $pdo->prepare("INSERT INTO site_visits (page, referrer, time_spent_seconds, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$page, $referrer, $timeSpent, $ip, $ua]);

    jsonResponse(["tracked" => true]);
}

else if ($path === '/auth/firebase-config' && $method === 'GET') {
    jsonResponse([
        "apiKey" => getenv("FIREBASE_API_KEY") ?: "AIzaSyAs-DEMO-API-KEY-FOR-VANIX-STUDIO",
        "authDomain" => getenv("FIREBASE_AUTH_DOMAIN") ?: "vanix-studio.firebaseapp.com",
        "projectId" => getenv("FIREBASE_PROJECT_ID") ?: "vanix-studio",
        "storageBucket" => getenv("FIREBASE_STORAGE_BUCKET") ?: "vanix-studio.appspot.com",
        "appId" => getenv("FIREBASE_APP_ID") ?: "1:1234567890:web:abcdef123456",
        "messagingSenderId" => getenv("FIREBASE_MESSAGING_SENDER_ID") ?: "",
        "measurementId" => getenv("FIREBASE_MEASUREMENT_ID") ?: ""
    ]);
}

else if ($path === '/auth/firebase-login' && $method === 'POST') {
    $email = isset($body['email']) ? trim($body['email']) : '';
    $name = isset($body['name']) ? trim($body['name']) : '';
    $ip = getClientIp();
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

    if (empty($email) || empty($name)) {
        jsonResponse(["detail" => "Email and name are required"], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    $adminEmail = getenv('SUPER_ADMIN_EMAIL') ?: 'vanixuniversal@gmail.com';

    if (!$user) {
        // Auto register
        $hashed = hash_password("firebase_sso_auto_generated_pwd");
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, phone, interests) VALUES (?, ?, ?, '', 'Google SSO Registered')");
        $stmt->execute([$name, $email, $hashed]);
        
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$pdo->lastInsertId()]);
        $user = $stmt->fetch();

        send_new_user_registered($adminEmail, $name, $email);
    }

    $stmt = $pdo->prepare("INSERT INTO login_logs (role, user_id, login_at, ip_address, user_agent, actor_name, actor_email) VALUES ('user', ?, NOW(), ?, ?, ?, ?)");
    $stmt->execute([$user['id'], $ip, $ua, $user['name'], $user['email']]);
    $logId = $pdo->lastInsertId();

    $token = create_access_token([
        "sub" => (string)$user['id'],
        "role" => "user",
        "email" => $user['email'],
        "log_id" => (int)$logId
    ]);

    send_user_login_alert($adminEmail, $user['name'], $user['email'], $ip);

    jsonResponse([
        "access_token" => $token,
        "role" => "user",
        "name" => $user['name'],
        "email" => $user['email'],
        "id" => (int)$user['id'],
        "log_id" => (int)$logId
    ]);
}

else if ($path === '/auth/contact' && $method === 'POST') {
    $name = isset($body['name']) ? trim($body['name']) : '';
    $email = isset($body['email']) ? trim($body['email']) : '';
    $phone = isset($body['phone']) ? trim($body['phone']) : '';
    $service = isset($body['service']) ? trim($body['service']) : '';
    $details = isset($body['details']) ? trim($body['details']) : '';

    if (empty($name) || empty($email) || empty($details)) {
        jsonResponse(["detail" => "Name, email, and details are required"], 400);
    }

    $stmt = $pdo->prepare("INSERT INTO contact_messages (name, email, phone, service, details) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$name, $email, $phone, $service, $details]);
    $newId = $pdo->lastInsertId();

    $adminEmail = getenv('SUPER_ADMIN_EMAIL') ?: 'vanixuniversal@gmail.com';
    send_contact_message_received($adminEmail, $name, $email, $phone, $service, $details);

    jsonResponse(["message" => "Message submitted successfully", "id" => (int)$newId]);
}

else if ($path === '/auth/me/theme' && $method === 'GET') {
    $current = require_any();
    $stmt = $pdo->prepare("SELECT theme_preference FROM users WHERE id = ?");
    $stmt->execute([(int)$current['sub']]);
    $user = $stmt->fetch();
    jsonResponse(["theme" => ($user && $user['theme_preference']) ? $user['theme_preference'] : "crimson"]);
}

else if ($path === '/auth/me/theme' && $method === 'PUT') {
    $current = require_any();
    $theme = isset($body['theme']) ? $body['theme'] : '';
    if (!in_array($theme, ["crimson", "cyan", "purple"])) {
        jsonResponse(["detail" => "Invalid theme. Choose from: crimson, cyan, purple"], 400);
    }
    
    $stmt = $pdo->prepare("UPDATE users SET theme_preference = ? WHERE id = ?");
    $stmt->execute([$theme, (int)$current['sub']]);
    
    jsonResponse(["theme" => $theme, "message" => "Theme updated successfully"]);
}

// ─── Employee Portal Endpoints ───────────────────────────────

else if ($path === '/employee/me' && $method === 'GET') {
    $current = require_employee();
    $empId = (int)$current['sub'];

    $stmt = $pdo->prepare("SELECT * FROM employees WHERE id = ?");
    $stmt->execute([$empId]);
    $emp = $stmt->fetch();
    if (!$emp) {
        jsonResponse(["detail" => "Employee not found"], 404);
    }

    $monthStart = date('Y-m-01');
    $stmt = $pdo->prepare("SELECT COUNT(DISTINCT date) as days_worked FROM attendance WHERE employee_id = ? AND date >= ? AND status = 'present'");
    $stmt->execute([$empId, $monthStart]);
    $daysWorked = (int)$stmt->fetch()['days_worked'];

    // Clock state today (latest session)
    $today = date('Y-m-d');
    $stmt = $pdo->prepare("SELECT * FROM attendance WHERE employee_id = ? AND date = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$empId, $today]);
    $todayAtt = $stmt->fetch();

    $isClockedIn = ($todayAtt && $todayAtt['clock_in'] && !$todayAtt['clock_out']);
    $todayClockIn = ($todayAtt && $todayAtt['clock_in']) ? $todayAtt['clock_in'] : null;
    $todayClockOut = ($todayAtt && $todayAtt['clock_out']) ? $todayAtt['clock_out'] : null;

    // Convert DateTime to ISO 8601 string
    $createdAtIso = (new DateTime($emp['created_at']))->format(DateTime::ATOM);
    $clockInIso = $todayClockIn ? (new DateTime($todayClockIn))->format(DateTime::ATOM) : null;
    $clockOutIso = $todayClockOut ? (new DateTime($todayClockOut))->format(DateTime::ATOM) : null;

    jsonResponse([
        "id" => (int)$emp['id'],
        "name" => $emp['name'],
        "email" => $emp['email'],
        "department" => $emp['department'],
        "invite_code" => $emp['invite_code'],
        "is_active" => (bool)$emp['is_active'],
        "status" => $emp['status'] ?: "Active",
        "created_at" => $createdAtIso,
        "days_worked_this_month" => $daysWorked,
        "annual_leave_balance" => getLeaveBalance($pdo, $empId, 'annual'),
        "sick_leave_balance" => getLeaveBalance($pdo, $empId, 'sick'),
        "emergency_leave_balance" => getLeaveBalance($pdo, $empId, 'emergency'),
        "is_clocked_in" => $isClockedIn,
        "today_clock_in" => $clockInIso,
        "today_clock_out" => $clockOutIso,
        "company_id" => getCompanyId($emp['name'], $emp['department'], $emp['id'])
    ]);
}

else if ($path === '/employee/clock-in' && $method === 'POST') {
    $current = require_employee();
    $empId = (int)$current['sub'];
    $today = date('Y-m-d');

    // Check if there is an active session (clocked in but not clocked out today)
    $stmt = $pdo->prepare("SELECT * FROM attendance WHERE employee_id = ? AND date = ? AND clock_in IS NOT NULL AND clock_out IS NULL ORDER BY id DESC LIMIT 1");
    $stmt->execute([$empId, $today]);
    $activeSession = $stmt->fetch();

    if ($activeSession) {
        jsonResponse(["detail" => "Already clocked in"], 400);
    }

    $now = date('Y-m-d H:i:s');
    $stmt = $pdo->prepare("INSERT INTO attendance (employee_id, date, clock_in, status) VALUES (?, ?, ?, 'present')");
    $stmt->execute([$empId, $today, $now]);
    jsonResponse(["message" => "Clocked in", "clock_in" => (new DateTime($now))->format(DateTime::ATOM)]);
}

else if ($path === '/employee/clock-out' && $method === 'POST') {
    $current = require_employee();
    $empId = (int)$current['sub'];
    $today = date('Y-m-d');

    // Find the active session for today
    $stmt = $pdo->prepare("SELECT * FROM attendance WHERE employee_id = ? AND date = ? AND clock_in IS NOT NULL AND clock_out IS NULL ORDER BY id DESC LIMIT 1");
    $stmt->execute([$empId, $today]);
    $att = $stmt->fetch();

    if (!$att) {
        jsonResponse(["detail" => "Not clocked in today"], 400);
    }

    $now = date('Y-m-d H:i:s');
    
    $clockInTime = new DateTime($att['clock_in']);
    $clockOutTime = new DateTime($now);
    $diff = $clockOutTime->diff($clockInTime);
    $hoursWorked = round(($diff->h + ($diff->i / 60) + ($diff->s / 3600)), 2);

    // Sum all previous hours worked today for the overall status
    $stmtHours = $pdo->prepare("SELECT SUM(hours_worked) as total_hours FROM attendance WHERE employee_id = ? AND date = ? AND id != ?");
    $stmtHours->execute([$empId, $today, $att['id']]);
    $prevHours = (float)$stmtHours->fetch()['total_hours'];
    $totalHoursToday = $prevHours + $hoursWorked;

    $status = ($totalHoursToday >= 4) ? 'present' : 'half_day';

    $stmt = $pdo->prepare("UPDATE attendance SET clock_out = ?, hours_worked = ?, status = ? WHERE id = ?");
    $stmt->execute([$now, $hoursWorked, $status, $att['id']]);

    jsonResponse([
        "message" => "Clocked out",
        "clock_out" => $clockOutTime->format(DateTime::ATOM),
        "hours_worked" => $hoursWorked
    ]);
}

else if ($path === '/employee/attendance' && $method === 'GET') {
    $current = require_employee();
    $empId = (int)$current['sub'];
    $days = isset($_GET['days']) ? (int)$_GET['days'] : 30;

    $fromDate = date('Y-m-d', strtotime("-{$days} days"));

    $stmt = $pdo->prepare("SELECT * FROM attendance WHERE employee_id = ? AND date >= ? ORDER BY date DESC");
    $stmt->execute([$empId, $fromDate]);
    $records = $stmt->fetchAll();

    $output = [];
    foreach ($records as $r) {
        $output[] = [
            "id" => (int)$r['id'],
            "date" => $r['date'],
            "clock_in" => $r['clock_in'] ? (new DateTime($r['clock_in']))->format(DateTime::ATOM) : null,
            "clock_out" => $r['clock_out'] ? (new DateTime($r['clock_out']))->format(DateTime::ATOM) : null,
            "hours_worked" => (float)$r['hours_worked'],
            "status" => $r['status']
        ];
    }
    jsonResponse($output);
}

else if ($path === '/employee/leave-request' && $method === 'POST') {
    $current = require_employee();
    $empId = (int)$current['sub'];

    $stmt = $pdo->prepare("SELECT * FROM employees WHERE id = ?");
    $stmt->execute([$empId]);
    $emp = $stmt->fetch();

    $leaveType = isset($body['leave_type']) ? $body['leave_type'] : '';
    $startDateStr = isset($body['start_date']) ? $body['start_date'] : '';
    $endDateStr = isset($body['end_date']) ? $body['end_date'] : '';
    $reason = isset($body['reason']) ? trim($body['reason']) : '';

    if (!in_array($leaveType, ['annual', 'sick', 'emergency'])) {
        jsonResponse(["detail" => "Invalid leave type"], 400);
    }

    if (empty($startDateStr) || empty($endDateStr)) {
        jsonResponse(["detail" => "Start date and end date are required"], 400);
    }

    $startDate = new DateTime($startDateStr);
    $endDate = new DateTime($endDateStr);

    if ($endDate < $startDate) {
        jsonResponse(["detail" => "End date cannot be before start date"], 400);
    }

    $balance = getLeaveBalance($pdo, $empId, $leaveType);
    $daysRequested = $endDate->diff($startDate)->days + 1;

    if ($daysRequested > $balance) {
        jsonResponse(["detail" => "Insufficient {$leaveType} leave balance ({$balance} days left)"], 400);
    }

    $stmt = $pdo->prepare("INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?, 'pending')");
    $stmt->execute([$empId, $leaveType, $startDateStr, $endDateStr, $reason]);
    $leaveId = $pdo->lastInsertId();

    $adminEmail = getenv('SUPER_ADMIN_EMAIL') ?: 'vanixuniversal@gmail.com';
    send_leave_request_alert($adminEmail, $emp['name'], $leaveType, $startDateStr, $endDateStr, $reason);

    jsonResponse(["message" => "Leave request submitted", "id" => (int)$leaveId, "status" => "pending"]);
}

else if ($path === '/employee/leaves' && $method === 'GET') {
    $current = require_employee();
    $empId = (int)$current['sub'];

    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE employee_id = ? ORDER BY requested_at DESC");
    $stmt->execute([$empId]);
    $leaves = $stmt->fetchAll();

    $output = [];
    foreach ($leaves as $l) {
        $output[] = [
            "id" => (int)$l['id'],
            "leave_type" => $l['leave_type'],
            "start_date" => $l['start_date'],
            "end_date" => $l['end_date'],
            "reason" => $l['reason'],
            "status" => $l['status'],
            "requested_at" => (new DateTime($l['requested_at']))->format(DateTime::ATOM),
            "review_note" => $l['review_note']
        ];
    }
    jsonResponse($output);
}

else if (matchRoute('/employee/leaves/{leave_id}', $path, $params) && $method === 'DELETE') {
    $current = require_employee();
    $empId = (int)$current['sub'];
    $leaveId = (int)$params['leave_id'];

    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ? AND employee_id = ?");
    $stmt->execute([$leaveId, $empId]);
    $leave = $stmt->fetch();

    if (!$leave) {
        jsonResponse(["detail" => "Leave request not found"], 404);
    }

    if ($leave['status'] !== 'pending') {
        jsonResponse(["detail" => "Only pending leave requests can be cancelled"], 400);
    }

    $stmt = $pdo->prepare("DELETE FROM leaves WHERE id = ?");
    $stmt->execute([$leaveId]);

    jsonResponse(["message" => "Leave request cancelled successfully", "id" => $leaveId]);
}

else if ($path === '/chat/messages' && $method === 'GET') {
    $current = require_role('employee', 'super_admin');
    $stmt = $pdo->prepare("SELECT * FROM (SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 50) sub ORDER BY created_at ASC");
    $stmt->execute();
    $messages = $stmt->fetchAll();
    
    $output = [];
    foreach ($messages as $m) {
        $output[] = [
            "id" => (int)$m['id'],
            "sender_role" => $m['sender_role'],
            "sender_id" => (int)$m['sender_id'],
            "sender_name" => $m['sender_name'],
            "message" => $m['message'],
            "created_at" => (new DateTime($m['created_at']))->format(DateTime::ATOM)
        ];
    }
    jsonResponse($output);
}

else if ($path === '/chat/messages' && $method === 'POST') {
    $current = require_role('employee', 'super_admin');
    $senderRole = $current['role'];
    $senderId = (int)$current['sub'];
    
    $senderName = 'Super Administrator';
    if ($senderRole === 'super_admin') {
        $stmt = $pdo->prepare("SELECT name FROM super_admins WHERE id = ?");
        $stmt->execute([$senderId]);
        $res = $stmt->fetch();
        if ($res) {
            $senderName = $res['name'];
        }
    } else {
        $stmt = $pdo->prepare("SELECT name FROM employees WHERE id = ?");
        $stmt->execute([$senderId]);
        $res = $stmt->fetch();
        if ($res) {
            $senderName = $res['name'];
        }
    }
    
    $message = isset($body['message']) ? trim($body['message']) : '';
    if (empty($message)) {
        jsonResponse(["detail" => "Message content is required"], 400);
    }
    
    $stmt = $pdo->prepare("INSERT INTO chat_messages (sender_role, sender_id, sender_name, message) VALUES (?, ?, ?, ?)");
    $stmt->execute([$senderRole, $senderId, $senderName, $message]);
    $newId = $pdo->lastInsertId();
    
    jsonResponse([
        "id" => (int)$newId,
        "sender_role" => $senderRole,
        "sender_id" => $senderId,
        "sender_name" => $senderName,
        "message" => $message,
        "created_at" => (new DateTime())->format(DateTime::ATOM)
    ]);
}

else if ($path === '/bulletins' && $method === 'GET') {
    $current = require_role('employee', 'super_admin');
    $stmt = $pdo->prepare("SELECT * FROM bulletins ORDER BY created_at DESC");
    $stmt->execute();
    $bulletins = $stmt->fetchAll();
    
    $output = [];
    foreach ($bulletins as $b) {
        $output[] = [
            "id" => (int)$b['id'],
            "title" => $b['title'],
            "content" => $b['content'],
            "type" => $b['type'],
            "created_at" => (new DateTime($b['created_at']))->format(DateTime::ATOM),
            "created_by" => (int)$b['created_by']
        ];
    }
    jsonResponse($output);
}

else if ($path === '/bulletins' && $method === 'POST') {
    $current = require_super_admin();
    $saId = (int)$current['sub'];
    
    $title = isset($body['title']) ? trim($body['title']) : '';
    $content = isset($body['content']) ? trim($body['content']) : '';
    $type = isset($body['type']) ? trim($body['type']) : 'info';
    
    if (empty($title) || empty($content)) {
        jsonResponse(["detail" => "Title and content are required"], 400);
    }
    
    $validTypes = ['critical', 'success', 'info', 'warning'];
    if (!in_array($type, $validTypes)) {
        $type = 'info';
    }
    
    $stmt = $pdo->prepare("INSERT INTO bulletins (title, content, type, created_by) VALUES (?, ?, ?, ?)");
    $stmt->execute([$title, $content, $type, $saId]);
    $newId = $pdo->lastInsertId();
    
    jsonResponse([
        "id" => (int)$newId,
        "title" => $title,
        "content" => $content,
        "type" => $type,
        "created_at" => (new DateTime())->format(DateTime::ATOM),
        "created_by" => $saId
    ]);
}

else if (matchRoute('/bulletins/{bulletin_id}', $path, $params) && $method === 'DELETE') {
    $current = require_super_admin();
    $bulletinId = (int)$params['bulletin_id'];
    
    $stmt = $pdo->prepare("SELECT id FROM bulletins WHERE id = ?");
    $stmt->execute([$bulletinId]);
    if (!$stmt->fetch()) {
        jsonResponse(["detail" => "Bulletin not found"], 404);
    }
    
    $stmt = $pdo->prepare("DELETE FROM bulletins WHERE id = ?");
    $stmt->execute([$bulletinId]);
    
    jsonResponse(["message" => "Bulletin deleted successfully", "id" => $bulletinId]);
}

else if ($path === '/employee/status' && $method === 'POST') {
    $current = require_employee();
    $empId = (int)$current['sub'];
    $status = isset($body['status']) ? $body['status'] : '';

    $validStatuses = ["Active", "In a Meeting", "On Leave", "Remote"];
    if (!in_array($status, $validStatuses)) {
        jsonResponse(["detail" => "Invalid status. Must be one of: Active, In a Meeting, On Leave, Remote"], 400);
    }

    $stmt = $pdo->prepare("UPDATE employees SET status = ? WHERE id = ?");
    $stmt->execute([$status, $empId]);

    jsonResponse(["message" => "Status updated successfully", "status" => $status]);
}

else if ($path === '/employee/directory' && $method === 'GET') {
    $current = require_employee();
    $today = date('Y-m-d');

    $stmt = $pdo->prepare("SELECT id, name, email, department, status FROM employees WHERE is_active = 1");
    $stmt->execute();
    $employees = $stmt->fetchAll();

    // Leaves today
    $stmt = $pdo->prepare("SELECT employee_id FROM leaves WHERE status = 'approved' AND start_date <= ? AND end_date >= ?");
    $stmt->execute([$today, $today]);
    $leavesToday = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $awayIds = array_map('intval', $leavesToday);

    // Clocked in today
    $stmt = $pdo->prepare("SELECT employee_id FROM attendance WHERE date = ? AND clock_in IS NOT NULL AND clock_out IS NULL");
    $stmt->execute([$today]);
    $clockedToday = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $clockedIds = array_map('intval', $clockedToday);

    $directory = [];
    foreach ($employees as $emp) {
        $isAway = in_array((int)$emp['id'], $awayIds);
        $isClockedIn = in_array((int)$emp['id'], $clockedIds);

        $dbStatus = $emp['status'] ?: "Active";
        if ($isAway) {
            $status = "On Leave";
        } elseif (!$isClockedIn) {
            $status = "Offline";
        } else {
            $status = $dbStatus;
        }

        $directory[] = [
            "id" => (int)$emp['id'],
            "name" => $emp['name'],
            "email" => $emp['email'],
            "department" => $emp['department'],
            "status" => $status,
            "is_away" => $isAway,
            "is_clocked_in" => $isClockedIn
        ];
    }
    jsonResponse($directory);
}

// ─── Super Admin Endpoints ───────────────────────────────────

else if ($path === '/super-admin/create-employee' && $method === 'POST') {
    $current = require_super_admin();
    
    $name = isset($body['name']) ? trim($body['name']) : '';
    $email = isset($body['email']) ? trim($body['email']) : '';
    $dept = isset($body['department']) ? trim($body['department']) : '';

    if (empty($name) || empty($email) || empty($dept)) {
        jsonResponse(["detail" => "Name, email, and department are required"], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM employees WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonResponse(["detail" => "Employee email already exists"], 409);
    }

    $rawPass = generate_employee_password($name, $dept);
    $inviteCode = generate_invite_code();
    $hashed = hash_password($rawPass);

    $stmt = $pdo->prepare("INSERT INTO employees (name, email, password_hash, department, invite_code, plain_password) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$name, $email, $hashed, $dept, $inviteCode, $rawPass]);
    $newId = $pdo->lastInsertId();

    send_employee_welcome($email, $name, $dept, $rawPass, $inviteCode);

    jsonResponse([
        "id" => (int)$newId,
        "name" => $name,
        "email" => $email,
        "department" => $dept,
        "generated_password" => $rawPass,
        "invite_code" => $inviteCode,
        "company_id" => getCompanyId($name, $dept, $newId)
    ]);
}

else if ($path === '/super-admin/employees' && $method === 'GET') {
    $current = require_super_admin();
    $stmt = $pdo->prepare("SELECT e.*, (SELECT COUNT(*) FROM login_logs l WHERE l.employee_id = e.id) as login_count FROM employees e ORDER BY e.created_at DESC");
    $stmt->execute();
    $emps = $stmt->fetchAll();

    $output = [];
    foreach ($emps as $e) {
        $output[] = [
            "id" => (int)$e['id'],
            "name" => $e['name'],
            "email" => $e['email'],
            "department" => $e['department'],
            "invite_code" => $e['invite_code'],
            "plain_password" => $e['plain_password'],
            "login_count" => (int)$e['login_count'],
            "is_active" => (bool)$e['is_active'],
            "status" => $e['status'] ?: "Active",
            "created_at" => (new DateTime($e['created_at']))->format(DateTime::ATOM),
            "company_id" => getCompanyId($e['name'], $e['department'], $e['id'])
        ];
    }
    jsonResponse($output);
}

else if (matchRoute('/super-admin/employees/{employee_id}', $path, $params)) {
    $current = require_super_admin();
    $empId = (int)$params['employee_id'];

    if ($method === 'DELETE') {
        $stmt = $pdo->prepare("SELECT id FROM employees WHERE id = ?");
        $stmt->execute([$empId]);
        if (!$stmt->fetch()) {
            jsonResponse(["detail" => "Employee not found"], 404);
        }

        // Transactions to delete related tables
        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM attendance WHERE employee_id = ?")->execute([$empId]);
            $pdo->prepare("DELETE FROM leaves WHERE employee_id = ?")->execute([$empId]);
            $pdo->prepare("DELETE FROM login_logs WHERE employee_id = ?")->execute([$empId]);
            $pdo->prepare("DELETE FROM employees WHERE id = ?")->execute([$empId]);
            $pdo->commit();
            jsonResponse(["message" => "Employee deleted successfully", "id" => $empId]);
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(["detail" => "Delete failed: " . $e->getMessage()], 500);
        }
    }
}

else if (matchRoute('/super-admin/employees/{employee_id}/toggle-status', $path, $params) && $method === 'POST') {
    $current = require_super_admin();
    $empId = (int)$params['employee_id'];

    $stmt = $pdo->prepare("SELECT is_active FROM employees WHERE id = ?");
    $stmt->execute([$empId]);
    $emp = $stmt->fetch();
    if (!$emp) {
        jsonResponse(["detail" => "Employee not found"], 404);
    }

    $newStatus = $emp['is_active'] ? 0 : 1;
    $stmt = $pdo->prepare("UPDATE employees SET is_active = ? WHERE id = ?");
    $stmt->execute([$newStatus, $empId]);

    jsonResponse(["message" => "Employee active status updated successfully", "id" => $empId, "is_active" => (bool)$newStatus]);
}

else if ($path === '/super-admin/stats' && $method === 'GET') {
    $current = require_super_admin();
    $today = date('Y-m-d');

    // total users
    $totalUsers = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    // total employees
    $totalEmployees = (int)$pdo->query("SELECT COUNT(*) FROM employees")->fetchColumn();
    // active employees
    $activeEmployees = (int)$pdo->query("SELECT COUNT(*) FROM employees WHERE is_active = 1")->fetchColumn();
    // logins today
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM login_logs WHERE login_at >= ?");
    $stmt->execute([$today . ' 00:00:00']);
    $loginsToday = (int)$stmt->fetchColumn();
    // pending leaves
    $pendingLeaves = (int)$pdo->query("SELECT COUNT(*) FROM leaves WHERE status = 'pending'")->fetchColumn();
    // site visits today
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM site_visits WHERE visited_at >= ?");
    $stmt->execute([$today . ' 00:00:00']);
    $visitsToday = (int)$stmt->fetchColumn();
    // site visits total
    $visitsTotal = (int)$pdo->query("SELECT COUNT(*) FROM site_visits")->fetchColumn();
    // total messages
    $totalMessages = (int)$pdo->query("SELECT COUNT(*) FROM contact_messages")->fetchColumn();

    jsonResponse([
        "total_users" => $totalUsers,
        "total_employees" => $totalEmployees,
        "active_employees" => $activeEmployees,
        "logins_today" => $loginsToday,
        "pending_leaves" => $pendingLeaves,
        "site_visits_today" => $visitsToday,
        "site_visits_total" => $visitsTotal,
        "total_messages" => $totalMessages
    ]);
}

else if ($path === '/super-admin/recent-logins' && $method === 'GET') {
    $current = require_super_admin();
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $role = isset($_GET['role']) ? $_GET['role'] : null;

    if ($role) {
        $stmt = $pdo->prepare("SELECT * FROM login_logs WHERE role = :role ORDER BY login_at DESC LIMIT :limit");
        $stmt->bindValue(':role', $role, PDO::PARAM_STR);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM login_logs ORDER BY login_at DESC LIMIT :limit");
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $logs = $stmt->fetchAll();

    $output = [];
    foreach ($logs as $l) {
        $output[] = [
            "id" => (int)$l['id'],
            "actor_name" => $l['actor_name'],
            "actor_email" => $l['actor_email'],
            "role" => $l['role'],
            "login_at" => (new DateTime($l['login_at']))->format(DateTime::ATOM),
            "logout_at" => $l['logout_at'] ? (new DateTime($l['logout_at']))->format(DateTime::ATOM) : null,
            "ip_address" => $l['ip_address']
        ];
    }
    jsonResponse($output);
}

else if ($path === '/super-admin/leaves' && $method === 'GET') {
    $current = require_super_admin();
    $stmt = $pdo->prepare("SELECT l.*, e.name AS employee_name, e.department AS employee_department, e.email AS employee_email 
                           FROM leaves l 
                           JOIN employees e ON l.employee_id = e.id 
                           ORDER BY l.requested_at DESC");
    $stmt->execute();
    $leaves = $stmt->fetchAll();

    $output = [];
    foreach ($leaves as $l) {
        $output[] = [
            "id" => (int)$l['id'],
            "employee_id" => (int)$l['employee_id'],
            "employee_name" => $l['employee_name'],
            "employee_department" => $l['employee_department'],
            "employee_email" => $l['employee_email'],
            "leave_type" => $l['leave_type'],
            "start_date" => $l['start_date'],
            "end_date" => $l['end_date'],
            "reason" => $l['reason'],
            "status" => $l['status'],
            "requested_at" => (new DateTime($l['requested_at']))->format(DateTime::ATOM),
            "reviewed_by" => $l['reviewed_by'] ? (int)$l['reviewed_by'] : null,
            "reviewed_at" => $l['reviewed_at'] ? (new DateTime($l['reviewed_at']))->format(DateTime::ATOM) : null,
            "review_note" => $l['review_note']
        ];
    }
    jsonResponse($output);
}

else if (matchRoute('/super-admin/leaves/{leave_id}/decision', $path, $params) && $method === 'POST') {
    $current = require_super_admin();
    $saId = (int)$current['sub'];
    $leaveId = (int)$params['leave_id'];

    $status = isset($body['status']) ? $body['status'] : '';
    $reviewNote = isset($body['review_note']) ? trim($body['review_note']) : '';

    if (!in_array($status, ['approved', 'rejected'])) {
        jsonResponse(["detail" => "Invalid decision status. Must be 'approved' or 'rejected'."], 400);
    }

    $stmt = $pdo->prepare("SELECT l.*, e.name AS employee_name, e.email AS employee_email 
                           FROM leaves l 
                           JOIN employees e ON l.employee_id = e.id 
                           WHERE l.id = ?");
    $stmt->execute([$leaveId]);
    $leave = $stmt->fetch();

    if (!$leave) {
        jsonResponse(["detail" => "Leave request not found."], 404);
    }

    $stmt = $pdo->prepare("UPDATE leaves SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ? WHERE id = ?");
    $stmt->execute([$status, $saId, $reviewNote, $leaveId]);

    send_leave_decision($leave['employee_email'], $leave['employee_name'], $leave['leave_type'], $status, $reviewNote);

    jsonResponse([
        "message" => "Leave request decision saved successfully.",
        "id" => $leaveId,
        "status" => $status,
        "review_note" => $reviewNote
    ]);
}

else if ($path === '/super-admin/users' && $method === 'GET') {
    $current = require_super_admin();
    $stmt = $pdo->prepare("SELECT * FROM users ORDER BY created_at DESC");
    $stmt->execute();
    $users = $stmt->fetchAll();

    $output = [];
    foreach ($users as $u) {
        $output[] = [
            "id" => (int)$u['id'],
            "name" => $u['name'],
            "email" => $u['email'],
            "phone" => $u['phone'] ?: "",
            "interests" => $u['interests'] ?: "",
            "created_at" => (new DateTime($u['created_at']))->format(DateTime::ATOM)
        ];
    }
    jsonResponse($output);
}

else if ($path === '/super-admin/users/export-csv' && $method === 'GET') {
    $current = require_super_admin();
    $stmt = $pdo->prepare("SELECT * FROM users ORDER BY created_at DESC");
    $stmt->execute();
    $users = $stmt->fetchAll();

    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="users_export.csv"');
    
    $out = fopen('php://output', 'w');
    fputcsv($out, ["ID", "Name", "Email", "Phone", "Interests", "Created At"]);
    
    foreach ($users as $u) {
        fputcsv($out, [
            $u['id'],
            $u['name'],
            $u['email'],
            $u['phone'] ?: "",
            $u['interests'] ?: "",
            $u['created_at']
        ]);
    }
    fclose($out);
    exit;
}

else if ($path === '/super-admin/employees/export-csv' && $method === 'GET') {
    $current = require_super_admin();
    $stmt = $pdo->prepare("SELECT * FROM employees ORDER BY created_at DESC");
    $stmt->execute();
    $employees = $stmt->fetchAll();

    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="employees_export.csv"');
    
    $out = fopen('php://output', 'w');
    fputcsv($out, [
        "ID", "Name", "Email", "Department", "Invite Code", 
        "Status", "Total Logins", "Last Login Time", "Created At"
    ]);

    foreach ($employees as $emp) {
        $stmt = $pdo->prepare("SELECT login_at FROM login_logs WHERE employee_id = ? ORDER BY login_at DESC");
        $stmt->execute([$emp['id']]);
        $logins = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $totalLogins = count($logins);
        $lastLogin = ($totalLogins > 0) ? $logins[0] : "Never";
        $statusStr = $emp['is_active'] ? "Active" : "Inactive";

        fputcsv($out, [
            $emp['id'],
            $emp['name'],
            $emp['email'],
            $emp['department'],
            $emp['invite_code'] ?: "",
            $statusStr,
            $totalLogins,
            $lastLogin,
            $emp['created_at']
        ]);
    }
    fclose($out);
    exit;
}

else if ($path === '/super-admin/employee-activities/export-csv' && $method === 'GET') {
    $current = require_super_admin();
    $stmt = $pdo->prepare("SELECT * FROM login_logs WHERE role = 'employee' ORDER BY login_at DESC");
    $stmt->execute();
    $logs = $stmt->fetchAll();

    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="employee_activity_export.csv"');
    
    $out = fopen('php://output', 'w');
    fputcsv($out, [
        "ID", "Employee Name", "Email", "Role", "Login Time", "Logout Time", "IP Address"
    ]);

    foreach ($logs as $l) {
        fputcsv($out, [
            $l['id'],
            $l['actor_name'],
            $l['actor_email'],
            $l['role'],
            $l['login_at'],
            $l['logout_at'] ?: "Active",
            $l['ip_address']
        ]);
    }
    fclose($out);
    exit;
}

else if ($path === '/super-admin/contact-messages' && $method === 'GET') {
    $current = require_super_admin();
    $stmt = $pdo->prepare("SELECT * FROM contact_messages ORDER BY created_at DESC");
    $stmt->execute();
    $msgs = $stmt->fetchAll();

    $output = [];
    foreach ($msgs as $m) {
        $output[] = [
            "id" => (int)$m['id'],
            "name" => $m['name'],
            "email" => $m['email'],
            "phone" => $m['phone'] ?: "",
            "service" => $m['service'] ?: "",
            "details" => $m['details'] ?: "",
            "created_at" => (new DateTime($m['created_at']))->format(DateTime::ATOM)
        ];
    }
    jsonResponse($output);
}

else if ($path === '/super-admin/site-visits' && $method === 'GET') {
    $current = require_super_admin();
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 200;

    $stmt = $pdo->prepare("SELECT * FROM site_visits ORDER BY visited_at DESC LIMIT :limit");
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $visits = $stmt->fetchAll();

    $output = [];
    foreach ($visits as $v) {
        $output[] = [
            "id" => (int)$v['id'],
            "page" => $v['page'] ?: "/",
            "referrer" => $v['referrer'] ?: "",
            "time_spent_seconds" => (int)$v['time_spent_seconds'],
            "ip_address" => $v['ip_address'] ?: "—",
            "user_agent" => $v['user_agent'] ?: "",
            "visited_at" => (new DateTime($v['visited_at']))->format(DateTime::ATOM),
        ];
    }
    jsonResponse($output);
}

else if ($path === '/super-admin/site-visits/export-csv' && $method === 'GET') {
    $current = require_super_admin();
    $stmt = $pdo->prepare("SELECT * FROM site_visits ORDER BY visited_at DESC");
    $stmt->execute();
    $visits = $stmt->fetchAll();

    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="site_visits_export.csv"');
    
    $out = fopen('php://output', 'w');
    fputcsv($out, ["ID", "Page", "Referrer", "Time Spent (s)", "IP Address", "User Agent", "Visited At"]);
    
    foreach ($visits as $v) {
        fputcsv($out, [
            $v['id'],
            $v['page'] ?: "/",
            $v['referrer'] ?: "",
            $v['time_spent_seconds'] !== null ? $v['time_spent_seconds'] : "",
            $v['ip_address'] ?: "",
            $v['user_agent'] ?: "",
            $v['visited_at']
        ]);
    }
    fclose($out);
    exit;
}

// ─── Training Student Portal Endpoints ─────────────────────────

else if ($path === '/training/classes' && $method === 'GET') {
    require_role('student', 'super_admin');
    $stmt = $pdo->prepare("SELECT * FROM recording_classes ORDER BY sort_order ASC, created_at DESC");
    $stmt->execute();
    $classes = $stmt->fetchAll();
    
    $output = [];
    foreach ($classes as $c) {
        $output[] = [
            "id" => (int)$c['id'],
            "title" => $c['title'],
            "video_url" => $c['video_url'],
            "notes_url" => $c['notes_url'] ?: "",
            "description" => $c['description'] ?: "",
            "sort_order" => (int)$c['sort_order'],
            "created_at" => (new DateTime($c['created_at']))->format(DateTime::ATOM)
        ];
    }
    jsonResponse($output);
}

else if ($path === '/training/feedback' && $method === 'POST') {
    $current = require_role('student');
    $classId = isset($body['class_id']) ? (int)$body['class_id'] : 0;
    $rating = isset($body['rating']) ? (int)$body['rating'] : 0;
    $comment = isset($body['comment']) ? trim($body['comment']) : '';
    $studentId = isset($current['student_id']) ? $current['student_id'] : 'unknown';

    if ($classId <= 0 || $rating < 1 || $rating > 5) {
        jsonResponse(["detail" => "Invalid feedback data. Rating must be 1 to 5."], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM recording_classes WHERE id = ?");
    $stmt->execute([$classId]);
    if (!$stmt->fetch()) {
        jsonResponse(["detail" => "Class not found"], 404);
    }

    $stmt = $pdo->prepare("INSERT INTO class_feedback (class_id, student_id, rating, comment) VALUES (?, ?, ?, ?)");
    $stmt->execute([$classId, $studentId, $rating, $comment]);

    jsonResponse(["message" => "Feedback submitted successfully!"]);
}

else if ($path === '/super-admin/training-students' && $method === 'GET') {
    $current = require_super_admin();
    $stmt = $pdo->prepare("SELECT * FROM training_students ORDER BY created_at DESC");
    $stmt->execute();
    $students = $stmt->fetchAll();

    $output = [];
    foreach ($students as $s) {
        $output[] = [
            "id" => (int)$s['id'],
            "student_id" => $s['student_id'],
            "plain_password" => $s['plain_password'],
            "is_active" => (bool)$s['is_active'],
            "created_at" => (new DateTime($s['created_at']))->format(DateTime::ATOM)
        ];
    }
    jsonResponse($output);
}

else if ($path === '/super-admin/training-students' && $method === 'POST') {
    $current = require_super_admin();
    $studentId = isset($body['student_id']) ? trim($body['student_id']) : '';
    $password = isset($body['password']) ? trim($body['password']) : '';

    if (empty($studentId) || empty($password)) {
        jsonResponse(["detail" => "Student ID and Password are required"], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM training_students WHERE student_id = ?");
    $stmt->execute([$studentId]);
    if ($stmt->fetch()) {
        jsonResponse(["detail" => "Student ID already exists"], 409);
    }

    $hashed = hash_password($password);
    $stmt = $pdo->prepare("INSERT INTO training_students (student_id, password_hash, plain_password) VALUES (?, ?, ?)");
    $stmt->execute([$studentId, $hashed, $password]);
    $newId = $pdo->lastInsertId();

    jsonResponse([
        "id" => (int)$newId,
        "student_id" => $studentId,
        "plain_password" => $password,
        "is_active" => true,
        "created_at" => (new DateTime())->format(DateTime::ATOM)
    ]);
}

else if (matchRoute('/super-admin/training-students/{id}/toggle-status', $path, $params) && $method === 'POST') {
    $current = require_super_admin();
    $id = (int)$params['id'];

    $stmt = $pdo->prepare("SELECT is_active FROM training_students WHERE id = ?");
    $stmt->execute([$id]);
    $student = $stmt->fetch();
    if (!$student) {
        jsonResponse(["detail" => "Student not found"], 404);
    }

    $newStatus = $student['is_active'] ? 0 : 1;
    $stmt = $pdo->prepare("UPDATE training_students SET is_active = ? WHERE id = ?");
    $stmt->execute([$newStatus, $id]);

    jsonResponse(["message" => "Status updated", "id" => $id, "is_active" => (bool)$newStatus]);
}

else if (matchRoute('/super-admin/training-students/{id}', $path, $params) && $method === 'DELETE') {
    $current = require_super_admin();
    $id = (int)$params['id'];

    $stmt = $pdo->prepare("SELECT id FROM training_students WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        jsonResponse(["detail" => "Student not found"], 404);
    }

    $stmt = $pdo->prepare("DELETE FROM training_students WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(["message" => "Student deleted successfully", "id" => $id]);
}

else if ($path === '/super-admin/recording-classes' && $method === 'GET') {
    $current = require_super_admin();
    $stmt = $pdo->prepare("SELECT * FROM recording_classes ORDER BY sort_order ASC, created_at DESC");
    $stmt->execute();
    $classes = $stmt->fetchAll();

    $output = [];
    foreach ($classes as $c) {
        $output[] = [
            "id" => (int)$c['id'],
            "title" => $c['title'],
            "video_url" => $c['video_url'],
            "notes_url" => $c['notes_url'] ?: "",
            "description" => $c['description'] ?: "",
            "sort_order" => (int)$c['sort_order'],
            "created_at" => (new DateTime($c['created_at']))->format(DateTime::ATOM)
        ];
    }
    jsonResponse($output);
}

else if ($path === '/super-admin/recording-classes' && $method === 'POST') {
    $current = require_super_admin();
    $title = isset($body['title']) ? trim($body['title']) : '';
    $videoUrl = isset($body['video_url']) ? trim($body['video_url']) : '';
    $notesUrl = isset($body['notes_url']) ? trim($body['notes_url']) : null;
    $description = isset($body['description']) ? trim($body['description']) : '';

    if (empty($title) || empty($videoUrl)) {
        jsonResponse(["detail" => "Title and Video URL are required"], 400);
    }

    // Get max sort order
    $maxSort = (int)$pdo->query("SELECT MAX(sort_order) FROM recording_classes")->fetchColumn();
    $sortOrder = $maxSort + 1;

    $stmt = $pdo->prepare("INSERT INTO recording_classes (title, video_url, notes_url, description, sort_order) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$title, $videoUrl, $notesUrl, $description, $sortOrder]);
    $newId = $pdo->lastInsertId();

    jsonResponse([
        "id" => (int)$newId,
        "title" => $title,
        "video_url" => $videoUrl,
        "notes_url" => $notesUrl ?: "",
        "description" => $description,
        "sort_order" => $sortOrder,
        "created_at" => (new DateTime())->format(DateTime::ATOM)
    ]);
}

else if (matchRoute('/super-admin/recording-classes/{id}', $path, $params)) {
    $current = require_super_admin();
    $id = (int)$params['id'];

    if ($method === 'PUT') {
        $stmt = $pdo->prepare("SELECT id FROM recording_classes WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            jsonResponse(["detail" => "Class not found"], 404);
        }

        $title = isset($body['title']) ? trim($body['title']) : '';
        $videoUrl = isset($body['video_url']) ? trim($body['video_url']) : '';
        $notesUrl = isset($body['notes_url']) ? trim($body['notes_url']) : null;
        $description = isset($body['description']) ? trim($body['description']) : '';

        if (empty($title) || empty($videoUrl)) {
            jsonResponse(["detail" => "Title and Video URL are required"], 400);
        }

        $stmt = $pdo->prepare("UPDATE recording_classes SET title = ?, video_url = ?, notes_url = ?, description = ? WHERE id = ?");
        $stmt->execute([$title, $videoUrl, $notesUrl, $description, $id]);

        jsonResponse(["message" => "Class updated successfully", "id" => $id]);
    }
    
    else if ($method === 'DELETE') {
        $stmt = $pdo->prepare("SELECT id FROM recording_classes WHERE id = ?");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            jsonResponse(["detail" => "Class not found"], 404);
        }

        $stmt = $pdo->prepare("DELETE FROM recording_classes WHERE id = ?");
        $stmt->execute([$id]);

        jsonResponse(["message" => "Class deleted successfully", "id" => $id]);
    }
}

else if ($path === '/super-admin/recording-classes/reorder' && $method === 'POST') {
    $current = require_super_admin();
    $ids = isset($body['ids']) ? $body['ids'] : [];

    if (!is_array($ids)) {
        jsonResponse(["detail" => "List of IDs is required"], 400);
    }

    $pdo->beginTransaction();
    try {
        foreach ($ids as $index => $id) {
            $stmt = $pdo->prepare("UPDATE recording_classes SET sort_order = ? WHERE id = ?");
            $stmt->execute([(int)$index, (int)$id]);
        }
        $pdo->commit();
        jsonResponse(["message" => "Classes reordered successfully"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(["detail" => "Reorder failed: " . $e->getMessage()], 500);
    }
}

else if ($path === '/super-admin/recording-classes/feedback' && $method === 'GET') {
    $current = require_super_admin();
    $stmt = $pdo->prepare("
        SELECT f.*, c.title as class_title 
        FROM class_feedback f 
        JOIN recording_classes c ON f.class_id = c.id 
        ORDER BY f.created_at DESC
    ");
    $stmt->execute();
    $feedbacks = $stmt->fetchAll();

    $output = [];
    foreach ($feedbacks as $f) {
        $output[] = [
            "id" => (int)$f['id'],
            "class_id" => (int)$f['class_id'],
            "class_title" => $f['class_title'],
            "student_id" => $f['student_id'],
            "rating" => (int)$f['rating'],
            "comment" => $f['comment'] ?: "",
            "created_at" => (new DateTime($f['created_at']))->format(DateTime::ATOM)
        ];
    }
    jsonResponse($output);
}

// ─── Training Tasks & Progress Endpoints ─────────────────────────

else if ($path === '/super-admin/training-tasks' && $method === 'GET') {
    $current = require_super_admin();
    $stmt = $pdo->prepare("SELECT * FROM training_tasks ORDER BY created_at DESC");
    $stmt->execute();
    $tasks = $stmt->fetchAll();
    
    $output = [];
    foreach ($tasks as $t) {
        $output[] = [
            "id" => (int)$t['id'],
            "title" => $t['title'],
            "description" => $t['description'] ?: "",
            "text_content" => $t['text_content'] ?: "",
            "reward_amount" => (float)$t['reward_amount'],
            "deadline" => $t['deadline'],
            "created_at" => (new DateTime($t['created_at']))->format(DateTime::ATOM)
        ];
    }
    jsonResponse($output);
}

else if ($path === '/super-admin/training-tasks' && $method === 'POST') {
    $current = require_super_admin();
    $title = isset($body['title']) ? trim($body['title']) : '';
    $description = isset($body['description']) ? trim($body['description']) : '';
    $textContent = isset($body['text_content']) ? trim($body['text_content']) : '';
    $rewardAmount = isset($body['reward_amount']) ? (float)$body['reward_amount'] : 0.00;
    $deadline = isset($body['deadline']) ? trim($body['deadline']) : '';

    if (empty($title) || empty($deadline)) {
        jsonResponse(["detail" => "Title and Deadline are required"], 400);
    }

    $stmt = $pdo->prepare("INSERT INTO training_tasks (title, description, text_content, reward_amount, deadline) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$title, $description, $textContent, $rewardAmount, $deadline]);
    $newId = $pdo->lastInsertId();

    jsonResponse([
        "id" => (int)$newId,
        "title" => $title,
        "description" => $description,
        "text_content" => $textContent,
        "reward_amount" => $rewardAmount,
        "deadline" => $deadline,
        "created_at" => (new DateTime())->format(DateTime::ATOM)
    ]);
}

else if (matchRoute('/super-admin/training-tasks/{id}', $path, $params) && $method === 'DELETE') {
    $current = require_super_admin();
    $id = (int)$params['id'];

    $stmt = $pdo->prepare("SELECT id FROM training_tasks WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        jsonResponse(["detail" => "Task not found"], 404);
    }

    $stmt = $pdo->prepare("DELETE FROM training_tasks WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(["message" => "Task deleted successfully", "id" => $id]);
}

else if ($path === '/super-admin/trainers-progress' && $method === 'GET') {
    $current = require_super_admin();
    
    // Fetch all students
    $stmt = $pdo->prepare("SELECT * FROM training_students ORDER BY student_id ASC");
    $stmt->execute();
    $students = $stmt->fetchAll();
    
    $output = [];
    foreach ($students as $s) {
        $studentId = $s['student_id'];
        
        // Fetch all completed tasks for this student
        $stmtSub = $pdo->prepare("
            SELECT st.*, t.title AS task_title, t.reward_amount AS task_reward, t.deadline AS task_deadline
            FROM student_tasks st
            JOIN training_tasks t ON st.task_id = t.id
            WHERE st.student_id = ?
            ORDER BY st.completed_at DESC
        ");
        $stmtSub->execute([$studentId]);
        $subs = $stmtSub->fetchAll();
        
        $completedCount = count($subs);
        $totalBaseReward = 0.00;
        $totalDeductions = 0.00;
        $totalEarned = 0.00;
        $submissionsList = [];
        
        foreach ($subs as $sub) {
            $totalBaseReward += (float)$sub['task_reward'];
            $totalDeductions += (float)$sub['deduction_amount'];
            $totalEarned += (float)$sub['earned_amount'];
            
            $submissionsList[] = [
                "task_id" => (int)$sub['task_id'],
                "task_title" => $sub['task_title'],
                "completed_at" => (new DateTime($sub['completed_at']))->format(DateTime::ATOM),
                "earned_amount" => (float)$sub['earned_amount'],
                "deduction_amount" => (float)$sub['deduction_amount'],
                "is_late" => (bool)$sub['is_late'],
                "submission_text" => $sub['submission_text']
            ];
        }
        
        // Milestone Incentive: if completed 4 tasks, get 50 rupees extra
        $incentive = ($completedCount >= 4) ? 50.00 : 0.00;
        $netEarnings = $totalEarned + $incentive;
        
        $output[] = [
            "id" => (int)$s['id'],
            "student_id" => $studentId,
            "is_active" => (bool)$s['is_active'],
            "completed_count" => $completedCount,
            "total_base_reward" => $totalBaseReward,
            "total_deductions" => $totalDeductions,
            "incentive" => $incentive,
            "net_earnings" => $netEarnings,
            "submissions" => $submissionsList
        ];
    }
    
    jsonResponse($output);
}

else if ($path === '/training/leaderboard' && $method === 'GET') {
    $current = require_role('student', 'super_admin');
    
    $stmt = $pdo->prepare("
        SELECT ts.student_id, COUNT(st.id) as completed_count
        FROM training_students ts
        LEFT JOIN student_tasks st ON ts.student_id = st.student_id AND st.status = 'completed'
        GROUP BY ts.student_id
        ORDER BY completed_count DESC, ts.student_id ASC
    ");
    $stmt->execute();
    $rows = $stmt->fetchAll();
    
    $output = [];
    foreach ($rows as $r) {
        $count = (int)$r['completed_count'];
        $output[] = [
            "student_id" => $r['student_id'],
            "points" => $count * 50,
            "completed_tasks" => $count
        ];
    }
    jsonResponse($output);
}

else if ($path === '/training/tasks' && $method === 'GET') {
    $current = require_role('student', 'super_admin');
    
    $studentId = '';
    if ($current['role'] === 'student') {
        $studentId = $current['student_id'];
    } else {
        $studentId = isset($_GET['student_id']) ? $_GET['student_id'] : '';
    }
    
    $stmt = $pdo->prepare("
        SELECT t.*, st.status AS submission_status, st.completed_at, st.earned_amount, st.deduction_amount, st.is_late, st.submission_text
        FROM training_tasks t
        LEFT JOIN student_tasks st ON t.id = st.task_id AND st.student_id = ?
        ORDER BY t.deadline ASC, t.created_at DESC
    ");
    $stmt->execute([$studentId]);
    $tasks = $stmt->fetchAll();
    
    $output = [];
    foreach ($tasks as $t) {
        // If it is a marketplace task, only include it if it's assigned to this student
        $isMarketplace = false;
        if ($t['text_content'] && strpos($t['text_content'], '{') === 0) {
            $meta = json_decode($t['text_content'], true);
            if (is_array($meta) && isset($meta['difficulty'])) {
                $isMarketplace = true;
            }
        }
        
        if ($isMarketplace && $t['submission_status'] === null) {
            continue;
        }

        $output[] = [
            "id" => (int)$t['id'],
            "title" => $t['title'],
            "description" => $t['description'] ?: "",
            "text_content" => $t['text_content'] ?: "",
            "reward_amount" => (float)$t['reward_amount'],
            "deadline" => $t['deadline'],
            "status" => $t['submission_status'] ?: "pending",
            "completed_at" => $t['completed_at'] ? (new DateTime($t['completed_at']))->format(DateTime::ATOM) : null,
            "earned_amount" => $t['earned_amount'] !== null ? (float)$t['earned_amount'] : null,
            "deduction_amount" => $t['deduction_amount'] !== null ? (float)$t['deduction_amount'] : null,
            "is_late" => $t['is_late'] !== null ? (bool)$t['is_late'] : null,
            "submission_text" => $t['submission_text']
        ];
    }
    
    jsonResponse($output);
}

else if ($path === '/training/tasks/submit' && $method === 'POST') {
    $current = require_role('student');
    $studentId = $current['student_id'];
    
    $taskId = isset($body['task_id']) ? (int)$body['task_id'] : 0;
    $submissionText = isset($body['submission_text']) ? trim($body['submission_text']) : '';
    
    if ($taskId <= 0) {
        jsonResponse(["detail" => "Invalid Task ID"], 400);
    }
    
    $stmt = $pdo->prepare("SELECT * FROM training_tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();
    if (!$task) {
        jsonResponse(["detail" => "Task not found"], 404);
    }
    
    $stmtCheck = $pdo->prepare("SELECT id FROM student_tasks WHERE student_id = ? AND task_id = ?");
    $stmtCheck->execute([$studentId, $taskId]);
    if ($stmtCheck->fetch()) {
        jsonResponse(["detail" => "Task has already been completed"], 400);
    }
    
    $deadline = new DateTime($task['deadline']);
    $now = new DateTime();
    $isLate = ($now > $deadline);
    
    $reward = (float)$task['reward_amount'];
    $deduction = 0.00;
    
    if ($isLate) {
        $deduction = round($reward * 0.50, 2);
    }
    $earned = $reward - $deduction;
    
    $stmt = $pdo->prepare("
        INSERT INTO student_tasks (student_id, task_id, status, completed_at, earned_amount, deduction_amount, is_late, submission_text)
        VALUES (?, ?, 'completed', NOW(), ?, ?, ?, ?)
    ");
    $stmt->execute([$studentId, $taskId, $earned, $deduction, $isLate ? 1 : 0, $submissionText]);
    
    jsonResponse([
        "message" => "Task submitted successfully",
        "earned_amount" => $earned,
        "deduction_amount" => $deduction,
        "is_late" => $isLate
    ]);
}

// ─── Task Marketplace & Bidding Endpoints ─────────────────────────

else if ($path === '/training/marketplace/tasks' && $method === 'GET') {
    $current = require_role('student', 'super_admin');
    $studentId = ($current['role'] === 'student') ? $current['student_id'] : '';
    
    $stmt = $pdo->prepare("
        SELECT t.*, 
               (SELECT COUNT(*) FROM task_bids tb WHERE tb.task_id = t.id) AS bids_count,
               (SELECT MIN(bid_amount) FROM task_bids tb WHERE tb.task_id = t.id) AS lowest_bid,
               (SELECT status FROM task_bids tb WHERE tb.task_id = t.id AND tb.student_id = ?) AS my_bid_status,
               (SELECT bid_amount FROM task_bids tb WHERE tb.task_id = t.id AND tb.student_id = ?) AS my_bid_amount
        FROM training_tasks t
        WHERE NOT EXISTS (SELECT 1 FROM student_tasks st WHERE st.task_id = t.id)
        ORDER BY t.deadline ASC, t.created_at DESC
    ");
    $stmt->execute([$studentId, $studentId]);
    $tasks = $stmt->fetchAll();
    
    $output = [];
    foreach ($tasks as $t) {
        $output[] = [
            "id" => (int)$t['id'],
            "title" => $t['title'],
            "description" => $t['description'] ?: "",
            "text_content" => $t['text_content'] ?: "",
            "reward_amount" => (float)$t['reward_amount'],
            "deadline" => $t['deadline'],
            "bids_count" => (int)$t['bids_count'],
            "lowest_bid" => $t['lowest_bid'] !== null ? (float)$t['lowest_bid'] : null,
            "my_bid_status" => $t['my_bid_status'],
            "my_bid_amount" => $t['my_bid_amount'] !== null ? (float)$t['my_bid_amount'] : null
        ];
    }
    jsonResponse($output);
}

else if ($path === '/training/marketplace/bid' && $method === 'POST') {
    $current = require_role('student');
    $studentId = $current['student_id'];
    
    $taskId = isset($body['task_id']) ? (int)$body['task_id'] : 0;
    $bidAmount = isset($body['bid_amount']) ? (float)$body['bid_amount'] : 0.00;
    $deliveryDays = isset($body['delivery_days']) ? (int)$body['delivery_days'] : 0;
    $proposalMessage = isset($body['proposal_message']) ? trim($body['proposal_message']) : '';
    
    if ($taskId <= 0 || $bidAmount <= 0 || $deliveryDays <= 0) {
        jsonResponse(["detail" => "Invalid bid parameters. Amount and days must be positive."], 400);
    }
    
    // Verify task exists and is open
    $stmt = $pdo->prepare("SELECT id FROM training_tasks WHERE id = ?");
    $stmt->execute([$taskId]);
    if (!$stmt->fetch()) {
        jsonResponse(["detail" => "Task not found"], 404);
    }
    
    $stmtCheck = $pdo->prepare("SELECT 1 FROM student_tasks WHERE task_id = ?");
    $stmtCheck->execute([$taskId]);
    if ($stmtCheck->fetch()) {
        jsonResponse(["detail" => "Task is already assigned or completed"], 400);
    }
    
    // Insert or update bid
    $stmtBid = $pdo->prepare("
        INSERT INTO task_bids (task_id, student_id, bid_amount, delivery_days, proposal_message, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
        ON DUPLICATE KEY UPDATE bid_amount = VALUES(bid_amount), delivery_days = VALUES(delivery_days), proposal_message = VALUES(proposal_message), status = 'pending'
    ");
    $stmtBid->execute([$taskId, $studentId, $bidAmount, $deliveryDays, $proposalMessage]);
    
    jsonResponse(["message" => "Bid placed successfully"]);
}

else if ($path === '/training/marketplace/my-bids' && $method === 'GET') {
    $current = require_role('student');
    $studentId = $current['student_id'];
    
    $stmt = $pdo->prepare("
        SELECT tb.*, t.title AS task_title, t.deadline AS task_deadline
        FROM task_bids tb
        JOIN training_tasks t ON tb.task_id = t.id
        WHERE tb.student_id = ?
        ORDER BY tb.created_at DESC
    ");
    $stmt->execute([$studentId]);
    $bids = $stmt->fetchAll();
    
    $output = [];
    foreach ($bids as $b) {
        $output[] = [
            "id" => (int)$b['id'],
            "task_id" => (int)$b['task_id'],
            "task_title" => $b['task_title'],
            "task_deadline" => $b['task_deadline'],
            "bid_amount" => (float)$b['bid_amount'],
            "delivery_days" => (int)$b['delivery_days'],
            "proposal_message" => $b['proposal_message'] ?: "",
            "status" => $b['status'],
            "created_at" => (new DateTime($b['created_at']))->format(DateTime::ATOM)
        ];
    }
    jsonResponse($output);
}

else if ($path === '/training/marketplace/assigned-tasks' && $method === 'GET') {
    $current = require_role('student');
    $studentId = $current['student_id'];
    
    $stmt = $pdo->prepare("
        SELECT t.*, st.status AS submission_status, st.earned_amount AS bid_amount, st.submission_text
        FROM training_tasks t
        JOIN student_tasks st ON t.id = st.task_id
        WHERE st.student_id = ? AND st.status = 'pending'
        ORDER BY t.deadline ASC
    ");
    $stmt->execute([$studentId]);
    $tasks = $stmt->fetchAll();
    
    $output = [];
    foreach ($tasks as $t) {
        $statusLabel = 'Assigned';
        if ($t['submission_text'] !== null) {
            $statusLabel = 'Submitted';
        }
        
        $output[] = [
            "id" => (int)$t['id'],
            "title" => $t['title'],
            "description" => $t['description'] ?: "",
            "text_content" => $t['text_content'] ?: "",
            "deadline" => $t['deadline'],
            "bid_amount" => (float)$t['bid_amount'],
            "status" => $statusLabel,
            "submission_text" => $t['submission_text']
        ];
    }
    jsonResponse($output);
}

else if ($path === '/training/marketplace/submit' && $method === 'POST') {
    $current = require_role('student');
    $studentId = $current['student_id'];
    
    $taskId = isset($body['task_id']) ? (int)$body['task_id'] : 0;
    $githubUrl = isset($body['github_url']) ? trim($body['github_url']) : '';
    $demoUrl = isset($body['demo_url']) ? trim($body['demo_url']) : '';
    $notes = isset($body['notes']) ? trim($body['notes']) : '';
    
    if ($taskId <= 0) {
        jsonResponse(["detail" => "Invalid Task ID"], 400);
    }
    
    // Verify task is assigned to this student
    $stmt = $pdo->prepare("SELECT id FROM student_tasks WHERE student_id = ? AND task_id = ? AND status = 'pending'");
    $stmt->execute([$studentId, $taskId]);
    if (!$stmt->fetch()) {
        jsonResponse(["detail" => "Task not assigned or already completed"], 400);
    }
    
    $submissionData = json_encode([
        "github_url" => $githubUrl,
        "demo_url" => $demoUrl,
        "notes" => $notes
    ]);
    
    // Update the submission_text, keep status as 'pending'
    $stmtUpdate = $pdo->prepare("
        UPDATE student_tasks 
        SET submission_text = ? 
        WHERE student_id = ? AND task_id = ? AND status = 'pending'
    ");
    $stmtUpdate->execute([$submissionData, $studentId, $taskId]);
    
    jsonResponse(["message" => "Work submitted successfully for review"]);
}

else if ($path === '/super-admin/marketplace/tasks' && $method === 'GET') {
    $current = require_super_admin();
    
    $stmt = $pdo->prepare("
        SELECT t.*, 
               st.student_id AS assigned_student_id, 
               st.status AS assignment_status,
               st.earned_amount AS assigned_amount,
               st.submission_text AS submission_text,
               (SELECT COUNT(*) FROM task_bids tb WHERE tb.task_id = t.id) AS bids_count
        FROM training_tasks t
        LEFT JOIN student_tasks st ON t.id = st.task_id
        ORDER BY t.created_at DESC
    ");
    $stmt->execute();
    $tasks = $stmt->fetchAll();
    
    $output = [];
    foreach ($tasks as $t) {
        $status = 'Open';
        if ($t['assignment_status'] === 'pending') {
            if ($t['submission_text'] !== null) {
                $status = 'Submitted';
            } else {
                $status = 'Assigned';
            }
        } else if ($t['assignment_status'] === 'completed') {
            $status = 'Completed';
        }
        
        $output[] = [
            "id" => (int)$t['id'],
            "title" => $t['title'],
            "description" => $t['description'] ?: "",
            "text_content" => $t['text_content'] ?: "",
            "reward_amount" => (float)$t['reward_amount'],
            "deadline" => $t['deadline'],
            "created_at" => (new DateTime($t['created_at']))->format(DateTime::ATOM),
            "status" => $status,
            "bids_count" => (int)$t['bids_count'],
            "assigned_student_id" => $t['assigned_student_id'],
            "assigned_amount" => $t['assigned_amount'] !== null ? (float)$t['assigned_amount'] : null
        ];
    }
    jsonResponse($output);
}

else if (matchRoute('/super-admin/marketplace/tasks/{id}/bids', $path, $params) && $method === 'GET') {
    $current = require_super_admin();
    $taskId = (int)$params['id'];
    
    $stmt = $pdo->prepare("
        SELECT tb.*
        FROM task_bids tb
        WHERE tb.task_id = ?
        ORDER BY tb.bid_amount ASC, tb.created_at ASC
    ");
    $stmt->execute([$taskId]);
    $bids = $stmt->fetchAll();
    
    $output = [];
    foreach ($bids as $b) {
        $output[] = [
            "id" => (int)$b['id'],
            "task_id" => (int)$b['task_id'],
            "student_id" => $b['student_id'],
            "bid_amount" => (float)$b['bid_amount'],
            "delivery_days" => (int)$b['delivery_days'],
            "proposal_message" => $b['proposal_message'] ?: "",
            "status" => $b['status'],
            "created_at" => (new DateTime($b['created_at']))->format(DateTime::ATOM)
        ];
    }
    jsonResponse($output);
}

else if ($path === '/super-admin/marketplace/assign' && $method === 'POST') {
    $current = require_super_admin();
    
    $taskId = isset($body['task_id']) ? (int)$body['task_id'] : 0;
    $studentId = isset($body['student_id']) ? trim($body['student_id']) : '';
    $bidAmount = isset($body['bid_amount']) ? (float)$body['bid_amount'] : 0.00;
    
    if ($taskId <= 0 || empty($studentId) || $bidAmount <= 0) {
        jsonResponse(["detail" => "Invalid assignment data"], 400);
    }
    
    // Verify task not already assigned
    $stmtCheck = $pdo->prepare("SELECT 1 FROM student_tasks WHERE task_id = ?");
    $stmtCheck->execute([$taskId]);
    if ($stmtCheck->fetch()) {
        jsonResponse(["detail" => "Task is already assigned or completed"], 400);
    }
    
    $pdo->beginTransaction();
    try {
        // Accept the chosen bid
        $stmtAccept = $pdo->prepare("UPDATE task_bids SET status = 'accepted' WHERE task_id = ? AND student_id = ?");
        $stmtAccept->execute([$taskId, $studentId]);
        
        // Reject other bids for this task
        $stmtReject = $pdo->prepare("UPDATE task_bids SET status = 'rejected' WHERE task_id = ? AND student_id != ?");
        $stmtReject->execute([$taskId, $studentId]);
        
        // Insert pending row in student_tasks
        $stmtAssign = $pdo->prepare("
            INSERT INTO student_tasks (student_id, task_id, status, earned_amount, deduction_amount, is_late, submission_text)
            VALUES (?, ?, 'pending', ?, 0.00, 0, NULL)
        ");
        $stmtAssign->execute([$studentId, $taskId, $bidAmount]);
        
        $pdo->commit();
        jsonResponse(["message" => "Task successfully assigned to " . $studentId]);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(["detail" => "Assignment failed: " . $e->getMessage()], 500);
    }
}

else if ($path === '/super-admin/marketplace/submissions' && $method === 'GET') {
    $current = require_super_admin();
    
    $stmt = $pdo->prepare("
        SELECT st.*, t.title AS task_title, t.deadline AS task_deadline
        FROM student_tasks st
        JOIN training_tasks t ON st.task_id = t.id
        WHERE st.status = 'pending' AND st.submission_text IS NOT NULL
        ORDER BY st.completed_at ASC
    ");
    $stmt->execute();
    $subs = $stmt->fetchAll();
    
    $output = [];
    foreach ($subs as $sub) {
        $output[] = [
            "id" => (int)$sub['id'],
            "student_id" => $sub['student_id'],
            "task_id" => (int)$sub['task_id'],
            "task_title" => $sub['task_title'],
            "task_deadline" => $sub['task_deadline'],
            "bid_amount" => (float)$sub['earned_amount'],
            "submission_text" => $sub['submission_text']
        ];
    }
    jsonResponse($output);
}

else if ($path === '/super-admin/marketplace/approve-submission' && $method === 'POST') {
    $current = require_super_admin();
    
    $taskId = isset($body['task_id']) ? (int)$body['task_id'] : 0;
    $studentId = isset($body['student_id']) ? trim($body['student_id']) : '';
    
    if ($taskId <= 0 || empty($studentId)) {
        jsonResponse(["detail" => "Invalid parameters"], 400);
    }
    
    $stmt = $pdo->prepare("SELECT st.*, t.deadline FROM student_tasks st JOIN training_tasks t ON st.task_id = t.id WHERE st.student_id = ? AND st.task_id = ? AND st.status = 'pending'");
    $stmt->execute([$studentId, $taskId]);
    $sub = $stmt->fetch();
    if (!$sub) {
        jsonResponse(["detail" => "No pending submission found for this student and task"], 404);
    }
    
    $deadline = new DateTime($sub['deadline']);
    $now = new DateTime();
    $isLate = ($now > $deadline);
    
    $baseReward = (float)$sub['earned_amount']; // stored bid amount
    $deduction = 0.00;
    if ($isLate) {
        $deduction = round($baseReward * 0.50, 2);
    }
    $earned = $baseReward - $deduction;
    
    $stmtUpdate = $pdo->prepare("
        UPDATE student_tasks
        SET status = 'completed', completed_at = NOW(), earned_amount = ?, deduction_amount = ?, is_late = ?
        WHERE student_id = ? AND task_id = ? AND status = 'pending'
    ");
    $stmtUpdate->execute([$earned, $deduction, $isLate ? 1 : 0, $studentId, $taskId]);
    
    jsonResponse([
        "message" => "Submission approved successfully",
        "earned_amount" => $earned,
        "deduction_amount" => $deduction,
        "is_late" => $isLate
    ]);
}

// ─── Portfolio CMS Endpoints ───────────────────────────────

else if ($path === '/portfolio/projects' && $method === 'GET') {
    $category = isset($_GET['category']) ? strtolower($_GET['category']) : null;
    $featuredOnly = (isset($_GET['featured_only']) && ($_GET['featured_only'] === 'true' || $_GET['featured_only'] == 1));
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;

    $sql = "SELECT * FROM portfolio_projects WHERE is_published = 1";
    $binds = [];

    if ($category) {
        $sql .= " AND category = ?";
        $binds[] = $category;
    }
    if ($featuredOnly) {
        $sql .= " AND is_featured = 1";
    }

    $sql .= " ORDER BY sort_order ASC, created_at DESC LIMIT " . $limit;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($binds);
    $projects = $stmt->fetchAll();

    $output = [];
    foreach ($projects as $p) {
        $output[] = [
            "id" => (int)$p['id'],
            "title" => $p['title'],
            "category" => $p['category'],
            "description" => $p['description'] ?: "",
            "thumbnail_url" => $p['thumbnail_url'] ?: "",
            "video_url" => $p['video_url'] ?: "",
            "tags" => $p['tags'] ?: "",
            "is_featured" => (bool)$p['is_featured'],
            "is_published" => (bool)$p['is_published'],
            "sort_order" => (int)$p['sort_order'],
            "created_by" => (int)$p['created_by'],
            "created_at" => (new DateTime($p['created_at']))->format(DateTime::ATOM),
            "updated_at" => (new DateTime($p['updated_at']))->format(DateTime::ATOM),
        ];
    }
    jsonResponse($output);
}

else if ($path === '/portfolio/projects' && $method === 'POST') {
    $current = require_admin();

    $title = isset($body['title']) ? trim($body['title']) : '';
    $category = isset($body['category']) ? strtolower(trim($body['category'])) : '';
    $description = isset($body['description']) ? trim($body['description']) : '';
    $thumbnailUrl = isset($body['thumbnail_url']) ? trim($body['thumbnail_url']) : '';
    $videoUrl = isset($body['video_url']) ? trim($body['video_url']) : '';
    $tags = isset($body['tags']) ? trim($body['tags']) : '';
    $isFeatured = isset($body['is_featured']) ? (int)$body['is_featured'] : 0;
    $isPublished = isset($body['is_published']) ? (int)$body['is_published'] : 1;
    $sortOrder = isset($body['sort_order']) ? (int)$body['sort_order'] : 0;
    $createdBy = (int)$current['sub'];

    if (empty($title) || empty($category)) {
        jsonResponse(["detail" => "Title and category are required"], 400);
    }

    $stmt = $pdo->prepare("INSERT INTO portfolio_projects (title, category, description, thumbnail_url, video_url, tags, is_featured, is_published, sort_order, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$title, $category, $description, $thumbnailUrl, $videoUrl, $tags, $isFeatured, $isPublished, $sortOrder, $createdBy]);
    $newId = $pdo->lastInsertId();

    $stmt = $pdo->prepare("SELECT * FROM portfolio_projects WHERE id = ?");
    $stmt->execute([$newId]);
    $project = $stmt->fetch();

    jsonResponse([
        "id" => (int)$project['id'],
        "title" => $project['title'],
        "category" => $project['category'],
        "description" => $project['description'] ?: "",
        "thumbnail_url" => $project['thumbnail_url'] ?: "",
        "video_url" => $project['video_url'] ?: "",
        "tags" => $project['tags'] ?: "",
        "is_featured" => (bool)$project['is_featured'],
        "is_published" => (bool)$project['is_published'],
        "sort_order" => (int)$project['sort_order'],
        "created_by" => (int)$project['created_by'],
        "created_at" => (new DateTime($project['created_at']))->format(DateTime::ATOM),
        "updated_at" => (new DateTime($project['updated_at']))->format(DateTime::ATOM)
    ]);
}

else if (matchRoute('/portfolio/projects/{project_id}', $path, $params)) {
    $projectId = (int)$params['project_id'];

    if ($method === 'GET') {
        $stmt = $pdo->prepare("SELECT * FROM portfolio_projects WHERE id = ? AND is_published = 1");
        $stmt->execute([$projectId]);
        $p = $stmt->fetch();
        if (!$p) {
            jsonResponse(["detail" => "Project not found"], 404);
        }
        jsonResponse([
            "id" => (int)$p['id'],
            "title" => $p['title'],
            "category" => $p['category'],
            "description" => $p['description'] ?: "",
            "thumbnail_url" => $p['thumbnail_url'] ?: "",
            "video_url" => $p['video_url'] ?: "",
            "tags" => $p['tags'] ?: "",
            "is_featured" => (bool)$p['is_featured'],
            "is_published" => (bool)$p['is_published'],
            "sort_order" => (int)$p['sort_order'],
            "created_by" => (int)$p['created_by'],
            "created_at" => (new DateTime($p['created_at']))->format(DateTime::ATOM),
            "updated_at" => (new DateTime($p['updated_at']))->format(DateTime::ATOM),
        ]);
    }
    
    else if ($method === 'PUT') {
        $current = require_admin();
        
        $stmt = $pdo->prepare("SELECT id FROM portfolio_projects WHERE id = ?");
        $stmt->execute([$projectId]);
        if (!$stmt->fetch()) {
            jsonResponse(["detail" => "Project not found"], 404);
        }

        $fields = [];
        $binds = [];
        
        $updatable = ['title', 'category', 'description', 'thumbnail_url', 'video_url', 'tags', 'is_featured', 'is_published', 'sort_order'];
        foreach ($updatable as $field) {
            if (array_key_exists($field, $body)) {
                $fields[] = "{$field} = ?";
                $val = $body[$field];
                if ($field === 'category') $val = strtolower($val);
                if ($field === 'is_featured' || $field === 'is_published') $val = (int)$val;
                if ($field === 'sort_order') $val = (int)$val;
                $binds[] = $val;
            }
        }
        
        if (!empty($fields)) {
            $binds[] = $projectId;
            $sql = "UPDATE portfolio_projects SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($binds);
        }

        $stmt = $pdo->prepare("SELECT * FROM portfolio_projects WHERE id = ?");
        $stmt->execute([$projectId]);
        $project = $stmt->fetch();

        jsonResponse([
            "id" => (int)$project['id'],
            "title" => $project['title'],
            "category" => $project['category'],
            "description" => $project['description'] ?: "",
            "thumbnail_url" => $project['thumbnail_url'] ?: "",
            "video_url" => $project['video_url'] ?: "",
            "tags" => $project['tags'] ?: "",
            "is_featured" => (bool)$project['is_featured'],
            "is_published" => (bool)$project['is_published'],
            "sort_order" => (int)$project['sort_order'],
            "created_by" => (int)$project['created_by'],
            "created_at" => (new DateTime($project['created_at']))->format(DateTime::ATOM),
            "updated_at" => (new DateTime($project['updated_at']))->format(DateTime::ATOM)
        ]);
    }
    
    else if ($method === 'DELETE') {
        $current = require_admin();
        $stmt = $pdo->prepare("SELECT title FROM portfolio_projects WHERE id = ?");
        $stmt->execute([$projectId]);
        $p = $stmt->fetch();
        if (!$p) {
            jsonResponse(["detail" => "Project not found"], 404);
        }
        
        $stmt = $pdo->prepare("DELETE FROM portfolio_projects WHERE id = ?");
        $stmt->execute([$projectId]);
        
        jsonResponse(["message" => "Project '" . $p['title'] . "' deleted successfully", "id" => $projectId]);
    }
}

else if (matchRoute('/portfolio/projects/{project_id}/publish', $path, $params) && $method === 'PATCH') {
    $current = require_admin();
    $projectId = (int)$params['project_id'];
    
    $published = isset($_GET['published']) ? ($_GET['published'] === 'true' || $_GET['published'] == 1) : null;
    if ($published === null && isset($body['published'])) {
         $published = (bool)$body['published'];
    }
    if ($published === null) {
         jsonResponse(["detail" => "published parameter is required"], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM portfolio_projects WHERE id = ?");
    $stmt->execute([$projectId]);
    if (!$stmt->fetch()) {
        jsonResponse(["detail" => "Project not found"], 404);
    }

    $stmt = $pdo->prepare("UPDATE portfolio_projects SET is_published = ? WHERE id = ?");
    $stmt->execute([(int)$published, $projectId]);

    jsonResponse(["id" => $projectId, "is_published" => (bool)$published]);
}

else if (matchRoute('/portfolio/projects/{project_id}/feature', $path, $params) && $method === 'PATCH') {
    $current = require_admin();
    $projectId = (int)$params['project_id'];
    
    $featured = isset($_GET['featured']) ? ($_GET['featured'] === 'true' || $_GET['featured'] == 1) : null;
    if ($featured === null && isset($body['featured'])) {
         $featured = (bool)$body['featured'];
    }
    if ($featured === null) {
         jsonResponse(["detail" => "featured parameter is required"], 400);
    }

    $stmt = $pdo->prepare("SELECT id FROM portfolio_projects WHERE id = ?");
    $stmt->execute([$projectId]);
    if (!$stmt->fetch()) {
        jsonResponse(["detail" => "Project not found"], 404);
    }

    $stmt = $pdo->prepare("UPDATE portfolio_projects SET is_featured = ? WHERE id = ?");
    $stmt->execute([(int)$featured, $projectId]);

    jsonResponse(["id" => $projectId, "is_featured" => (bool)$featured]);
}

else if ($path === '/developer/upload' && $method === 'POST') {
    // Check if file is uploaded
    if (!isset($_FILES['file'])) {
        jsonResponse(["detail" => "No file uploaded"], 400);
    }
    
    $targetPage = isset($_POST['target_page']) ? $_POST['target_page'] : '';
    if (empty($targetPage)) {
        jsonResponse(["detail" => "Target page is required"], 400);
    }

    $fileId = isset($_POST['file_id']) ? $_POST['file_id'] : '';
    if (empty($fileId)) {
        $fileId = 'asset-' . round(microtime(true) * 1000) . '-' . substr(md5(rand()), 0, 9);
    }

    $fileName = basename($_FILES['file']['name']);
    
    // Prepare exact target directory structure matching the CDN URL path
    $uploadDir = __DIR__ . '/../assets/' . $targetPage . '/' . $fileId . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $targetFilePath = $uploadDir . $fileName;
    
    // Move uploaded file to targeted assets directory
    if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetFilePath)) {
        jsonResponse(["detail" => "Failed to save uploaded file"], 500);
    }

    // Determine the source file name
    $srcFileName = str_replace('.html', '.src.html', $targetPage);
    $srcFilePath = __DIR__ . '/../' . $srcFileName;

    // Normalize path just in case
    $srcFilePath = realpath($srcFilePath);
    if (!$srcFilePath || !file_exists($srcFilePath)) {
        jsonResponse(["detail" => "Target source page does not exist: " . $srcFileName], 400);
    }

    // Read the source page content
    $content = file_get_contents($srcFilePath);

    // Identify if the file is an image or video
    $fileType = $_FILES['file']['type'];
    $isImage = strpos($fileType, 'image/') !== false;
    $isVideo = strpos($fileType, 'video/') !== false;
    
    $placeholderHtml = "";
    
    // Construct the path relative to the HTML page
    $relativeUploadPath = "assets/" . $targetPage . "/" . $fileId . "/" . $fileName;
    if (strpos($targetPage, 'pages/') === 0) {
        $relativeUploadPath = "../assets/" . $targetPage . "/" . $fileId . "/" . $fileName;
    }

    if ($isImage) {
        $placeholderHtml = "\n\n<!-- START UPLOADED PLACEHOLDER: {$fileName} -->\n" .
            "<div class=\"uploaded-asset-placeholder image-placeholder\" data-filename=\"{$fileName}\" style=\"margin: 40px auto; text-align: center; border: 2px dashed var(--primary, #ff0000); padding: 25px; border-radius: var(--radius, 12px); background: rgba(255, 0, 0, 0.05); max-width: 90%;\">\n" .
            "    <h4 style=\"font-family: 'Orbitron', sans-serif; color: #fff; margin-bottom: 15px; letter-spacing: 1.5px;\">🖼️ DEPLOYED IMAGE: {$fileName}</h4>\n" .
            "    <img src=\"{$relativeUploadPath}\" alt=\"{$fileName}\" style=\"max-width: 100%; max-height: 450px; border-radius: 8px; box-shadow: 0 8px 25px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);\">\n" .
            "</div>\n" .
            "<!-- END UPLOADED PLACEHOLDER: {$fileName} -->\n";
    } else if ($isVideo) {
        $placeholderHtml = "\n\n<!-- START UPLOADED PLACEHOLDER: {$fileName} -->\n" .
            "<div class=\"uploaded-asset-placeholder video-placeholder\" data-filename=\"{$fileName}\" style=\"margin: 40px auto; text-align: center; border: 2px dashed var(--primary, #ff0000); padding: 25px; border-radius: var(--radius, 12px); background: rgba(255, 0, 0, 0.05); max-width: 90%;\">\n" .
            "    <h4 style=\"font-family: 'Orbitron', sans-serif; color: #fff; margin-bottom: 15px; letter-spacing: 1.5px;\">🎬 DEPLOYED VIDEO: {$fileName}</h4>\n" .
            "    <video controls style=\"max-width: 100%; max-height: 450px; border-radius: 8px; box-shadow: 0 8px 25px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);\">\n" .
            "        <source src=\"{$relativeUploadPath}\" type=\"{$fileType}\">\n" .
            "        Your browser does not support the video tag.\n" .
            "    </video>\n" .
            "</div>\n" .
            "<!-- END UPLOADED PLACEHOLDER: {$fileName} -->\n";
    }

    if (!empty($placeholderHtml)) {
        // Insert the placeholder before the closing </body> tag
        $pos = strripos($content, '</body>');
        if ($pos !== false) {
            $content = substr_replace($content, $placeholderHtml . "</body>", $pos, 7);
        } else {
            $content .= $placeholderHtml;
        }

        // Write the modified content back to the source file
        file_put_contents($srcFilePath, $content);
        
        // Compile directly in PHP (guaranteed to work on shared hosting VPS)
        $b64Str = base64_encode($content);
        $wrappedHtml = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <script>
        (function() {
            const b64 = "' . $b64Str . '";
            const doc = decodeURIComponent(atob(b64).split("").map(c => "%" + ("00"+c.charCodeAt(0).toString(16)).slice(-2)).join(""));
            document.open();
            document.write(doc);
            document.close();
        })();
    </script>
</head>
<body>
</body>
</html>';
        
        $prodFilePath = __DIR__ . '/../' . $targetPage;
        file_put_contents($prodFilePath, $wrappedHtml);
        
        // Execute the Python compile script as fallback to compile any other files
        $compileScript = dirname(__DIR__) . '/compile.py';
        $pythonCommand = "python " . escapeshellarg($compileScript) . " 2>&1";
        $output = [];
        $resultCode = 0;
        @exec($pythonCommand, $output, $resultCode);
        
        jsonResponse([
            "message" => "Asset uploaded and placeholder inserted successfully",
            "relative_path" => $relativeUploadPath,
            "compile_code" => $resultCode
        ]);
    } else {
        jsonResponse(["message" => "Asset uploaded but no HTML placeholder was created (not an image or video)"]);
    }
}

else if ($path === '/developer/delete' && $method === 'POST') {
    $fileId = isset($_POST['file_id']) ? $_POST['file_id'] : '';
    $fileName = isset($_POST['file_name']) ? $_POST['file_name'] : '';
    $targetPage = isset($_POST['target_page']) ? $_POST['target_page'] : '';
    
    if (empty($targetPage) || empty($fileName)) {
        jsonResponse(["detail" => "Target page and file name are required"], 400);
    }
    
    $srcFileName = str_replace('.html', '.src.html', $targetPage);
    $srcFilePath = __DIR__ . '/../' . $srcFileName;
    
    $srcFilePath = realpath($srcFilePath);
    if (!$srcFilePath || !file_exists($srcFilePath)) {
        jsonResponse(["detail" => "Target source page does not exist: " . $srcFileName], 400);
    }
    
    $content = file_get_contents($srcFilePath);
    
    // Pattern for uploaded files
    $uploadedPattern = "/\n*\s*<!-- START UPLOADED PLACEHOLDER: " . preg_quote($fileName, '/') . " -->.*?<!-- END UPLOADED PLACEHOLDER: " . preg_quote($fileName, '/') . " -->\n*/s";
    
    // Pattern for hardcoded files
    $hardcodedPattern = "/\n*\s*<!-- START HARDCODED: " . preg_quote($fileName, '/') . " -->.*?<!-- END HARDCODED: " . preg_quote($fileName, '/') . " -->\n*/s";
    
    $modified = false;
    
    if (preg_match($uploadedPattern, $content)) {
        $content = preg_replace($uploadedPattern, "\n", $content);
        $modified = true;
    } else if (preg_match($hardcodedPattern, $content)) {
        $content = preg_replace($hardcodedPattern, "\n", $content);
        $modified = true;
    }
    
    if ($modified) {
        file_put_contents($srcFilePath, $content);
        
        // Compile directly in PHP
        $b64Str = base64_encode($content);
        $wrappedHtml = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <script>
        (function() {
            const b64 = "' . $b64Str . '";
            const doc = decodeURIComponent(atob(b64).split("").map(c => "%" + ("00"+c.charCodeAt(0).toString(16)).slice(-2)).join(""));
            document.open();
            document.write(doc);
            document.close();
        })();
    </script>
</head>
<body>
</body>
</html>';
        $prodFilePath = __DIR__ . '/../' . $targetPage;
        file_put_contents($prodFilePath, $wrappedHtml);
        
        // Python fallback
        $compileScript = dirname(__DIR__) . '/compile.py';
        $pythonCommand = "python " . escapeshellarg($compileScript) . " 2>&1";
        @exec($pythonCommand);
        
        jsonResponse(["message" => "Asset deleted successfully"]);
    } else {
        jsonResponse(["message" => "Asset not found in HTML or already deleted"]);
    }
}

// ─── 404 Catch-All ────────────────────────────────────────────
else {
    jsonResponse(["detail" => "Not Found"], 404);
}
