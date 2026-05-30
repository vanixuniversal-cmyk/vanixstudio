<?php
/**
 * config.php — Environment and Database Configurations
 */

// Load dotenv helper
function loadEnv($path) {
    if (!file_exists($path)) {
        return false;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            // Remove surrounding quotes
            if (preg_match('/^([\'"])(.*)\1$/', $value, $matches)) {
                $value = $matches[2];
            }
            // Put in environment if not already set
            putenv("{$name}={$value}");
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
    return true;
}

// Check if .env is missing and recreate it automatically to prevent deletion issues
$envPath = __DIR__ . '/.env';
if (!file_exists($envPath)) {
    $envContent = "# Auto-restored by config.php to prevent deletion during deployments\n" .
                  "DATABASE_URL=mysql://u295029129_vanixstudio:Vanix@123@srv2210.hstgr.io:3306/u295029129_vanixstudio\n" .
                  "JWT_SECRET_KEY=vanix_studio_super_secret_jwt_key_2025\n" .
                  "JWT_ALGORITHM=HS256\n" .
                  "ACCESS_TOKEN_EXPIRE_MINUTES=1440\n" .
                  "SUPER_ADMIN_EMAIL=vanixuniversal@gmail.com\n" .
                  "SUPER_ADMIN_PASSWORD=VNX@SuperAdmin#2025\n" .
                  "GMAIL_USER=vanixuniversal@gmail.com\n" .
                  "GMAIL_APP_PASSWORD=ookmesskyavghodc\n" .
                  "FRONTEND_URL=https://vanix.co.in\n" .
                  "PROD_DOMAIN=vanix.co.in\n" .
                  "ENV=production\n" .
                  "FIREBASE_API_KEY=AIzaSyCbboR14h5_xVF4WBQRzyi4c0tb9ZCOd0g\n" .
                  "FIREBASE_AUTH_DOMAIN=vanix-studio.firebaseapp.com\n" .
                  "FIREBASE_PROJECT_ID=vanix-studio\n" .
                  "FIREBASE_STORAGE_BUCKET=vanix-studio.firebasestorage.app\n" .
                  "FIREBASE_APP_ID=1:460374534778:web:bc5e3733ecdc4ed2e0a9c3\n" .
                  "FIREBASE_MESSAGING_SENDER_ID=460374534778\n" .
                  "FIREBASE_MEASUREMENT_ID=G-SN2VJKG3K1\n";
    @file_put_contents($envPath, $envContent);
}

// Locate and load .env file from candidate directories
$envLoaded = false;
$candidates = [
    __DIR__ . '/.env',
    __DIR__ . '/../.env',
    __DIR__ . '/../backend/.env'
];
foreach ($candidates as $candidate) {
    if (loadEnv($candidate)) {
        $envLoaded = true;
        break;
    }
}

// Fallback defaults if env is missing or properties aren't set
if (!getenv('DATABASE_URL')) putenv('DATABASE_URL=mysql://u295029129_vanixstudio:Vanix@123@srv2210.hstgr.io:3306/u295029129_vanixstudio');
if (!getenv('JWT_SECRET_KEY')) putenv('JWT_SECRET_KEY=vanix_studio_super_secret_jwt_key_2025');
if (!getenv('JWT_ALGORITHM')) putenv('JWT_ALGORITHM=HS256');
if (!getenv('SUPER_ADMIN_EMAIL')) putenv('SUPER_ADMIN_EMAIL=vanixuniversal@gmail.com');
if (!getenv('SUPER_ADMIN_PASSWORD')) putenv('SUPER_ADMIN_PASSWORD=VNX@SuperAdmin#2025');
if (!getenv('GMAIL_USER')) putenv('GMAIL_USER=vanixuniversal@gmail.com');
if (!getenv('GMAIL_APP_PASSWORD')) putenv('GMAIL_APP_PASSWORD=ookmesskyavghodc');
if (!getenv('FRONTEND_URL')) putenv('FRONTEND_URL=https://vanix.co.in');
if (!getenv('PROD_DOMAIN')) putenv('PROD_DOMAIN=vanix.co.in');
if (!getenv('ENV')) putenv('ENV=production');

/**
 * Get PDO MySQL database connection
 */
function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dbUrl = getenv('DATABASE_URL');
    $host = 'localhost';
    $user = 'root';
    $pass = '';
    $dbname = 'vanix_studio';
    $port = '3306';

    if ($dbUrl) {
        $parsedUrl = parse_url($dbUrl);
        if ($parsedUrl) {
            $host = isset($parsedUrl['host']) ? $parsedUrl['host'] : $host;
            $user = isset($parsedUrl['user']) ? $parsedUrl['user'] : $user;
            $pass = isset($parsedUrl['pass']) ? $parsedUrl['pass'] : $pass;
            $port = isset($parsedUrl['port']) ? $parsedUrl['port'] : $port;
            $dbname = isset($parsedUrl['path']) ? ltrim($parsedUrl['path'], '/') : $dbname;
        }
    } else {
        $host = getenv('DB_HOST') ?: $host;
        $user = getenv('DB_USER') ?: $user;
        $pass = getenv('DB_PASS') ?: $pass;
        $dbname = getenv('DB_NAME') ?: $dbname;
        $port = getenv('DB_PORT') ?: $port;
    }

    try {
        $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        return $pdo;
    } catch (PDOException $e) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode([
            'detail' => 'Database connection failed: ' . $e->getMessage()
        ]);
        exit;
    }
}
