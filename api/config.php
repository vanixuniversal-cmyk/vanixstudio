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

// Fallback defaults if env is missing
if (!getenv('JWT_SECRET_KEY')) putenv('JWT_SECRET_KEY=vanix_secret_key');
if (!getenv('JWT_ALGORITHM')) putenv('JWT_ALGORITHM=HS256');
if (!getenv('SUPER_ADMIN_EMAIL')) putenv('SUPER_ADMIN_EMAIL=vanixuniversal@gmail.com');
if (!getenv('SUPER_ADMIN_PASSWORD')) putenv('SUPER_ADMIN_PASSWORD=VNX@SuperAdmin#2025');

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
