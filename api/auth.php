<?php
/**
 * auth.php — Password hashing, JWT utilities, and authentication middleware
 */

require_once __DIR__ . '/config.php';

// ─── Password Utilities ───────────────────────────────────────

function hash_password(string $plain): string {
    return password_hash($plain, PASSWORD_BCRYPT);
}

function verify_password(string $plain, string $hashed): bool {
    return password_verify($plain, $hashed);
}

function generate_employee_password(string $name, string $dept): string {
    $suffix = str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
    $initials = strtoupper(substr(cleanString($name), 0, 2) . substr(cleanString($dept), 0, 2));
    return "VNX@{$initials}{$suffix}";
}

function generate_invite_code(): string {
    return "VNX-" . rand(1000, 9999);
}

function cleanString(string $string): string {
    return preg_replace('/[^a-zA-Z]/', '', $string);
}

// ─── JWT Utilities ────────────────────────────────────────────

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

/**
 * Generate a JWT token
 */
function create_access_token(array $data, int $expire_minutes = null): string {
    $secret = getenv('JWT_SECRET_KEY') ?: 'vanix_secret_key';
    if ($expire_minutes === null) {
        $expire_minutes = (int)(getenv('ACCESS_TOKEN_EXPIRE_MINUTES') ?: 1440);
    }
    
    $payload = $data;
    $payload['exp'] = time() + ($expire_minutes * 60);
    $payload['iat'] = time();

    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $header64 = base64url_encode($header);
    $payload64 = base64url_encode(json_encode($payload));
    
    $signature = hash_hmac('sha256', $header64 . "." . $payload64, $secret, true);
    $signature64 = base64url_encode($signature);

    return $header64 . "." . $payload64 . "." . $signature64;
}

/**
 * Decode and verify JWT token
 */
function decode_token(string $token): array {
    $secret = getenv('JWT_SECRET_KEY') ?: 'vanix_secret_key';
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        throw new Exception('Invalid token structure');
    }
    
    list($header64, $payload64, $signature64) = $parts;
    
    $header = json_decode(base64url_decode($header64), true);
    if (!$header || !isset($header['alg']) || $header['alg'] !== 'HS256') {
        throw new Exception('Invalid or unsupported algorithm');
    }
    
    $signature = base64url_decode($signature64);
    $expectedSignature = hash_hmac('sha256', $header64 . "." . $payload64, $secret, true);
    
    if (!hash_equals($signature, $expectedSignature)) {
        throw new Exception('Signature verification failed');
    }
    
    $payload = json_decode(base64url_decode($payload64), true);
    if (!$payload) {
        throw new Exception('Invalid token payload');
    }
    
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        throw new Exception('Token has expired');
    }
    
    return $payload;
}

// ─── Middleware: Get Current User and Roles ───────────────────

function get_bearer_token(): ?string {
    $headers = [];
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
    }
    
    // Check if Authorization header is set in apache_request_headers
    $hasAuth = false;
    foreach ($headers as $name => $value) {
        if (strcasecmp($name, 'Authorization') === 0) {
            $hasAuth = true;
            break;
        }
    }
    
    // Fallback to $_SERVER if missing
    if (!$hasAuth) {
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers['Authorization'] = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $headers['Authorization'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
    }
    
    foreach ($headers as $name => $value) {
        if (strcasecmp($name, 'Authorization') === 0) {
            if (preg_match('/Bearer\s(\S+)/i', $value, $matches)) {
                return $matches[1];
            }
        }
    }
    return null;
}

function get_current_user_token(): array {
    $token = get_bearer_token();
    if (!$token) {
        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode(['detail' => 'Not authenticated']);
        exit;
    }
    
    try {
        return decode_token($token);
    } catch (Exception $e) {
        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode(['detail' => $e->getMessage()]);
        exit;
    }
}

/**
 * Enforce that the user has one of the required roles
 */
function require_role(string ...$roles): array {
    $currentUser = get_current_user_token();
    $userRole = isset($currentUser['role']) ? $currentUser['role'] : '';
    
    if (!in_array($userRole, $roles)) {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode(['detail' => 'Insufficient permissions']);
        exit;
    }
    
    return $currentUser;
}

// Helper functions matching Python routers
function require_super_admin() { return require_role('super_admin'); }
function require_admin() { return require_role('admin', 'super_admin'); }
function require_employee() { return require_role('employee', 'admin', 'super_admin'); }
function require_student() { return require_role('student', 'super_admin'); }
function require_any() { return require_role('user', 'employee', 'admin', 'super_admin', 'student'); }

// Fallback helper if apache_request_headers doesn't exist
if (!function_exists('apache_request_headers')) {
    function apache_request_headers() {
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (substr($key, 0, 5) <> 'HTTP_') {
                continue;
            }
            $header = str_replace(' ', '-', ucwords(str_replace('_', ' ', strtolower(substr($key, 5)))));
            $headers[$header] = $value;
        }
        return $headers;
    }
}
