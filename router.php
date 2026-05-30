<?php
/**
 * router.php — Local development router for PHP built-in web server
 * Usage: php -S localhost:8000 router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 1. Route API requests to api/index.php
if (strpos($uri, '/api/') === 0) {
    $_SERVER['SCRIPT_NAME'] = '/api/index.php';
    include __DIR__ . '/api/index.php';
    exit;
}

// 2. Serve static HTML/CSS/JS files from the root directory
$frontendDir = __DIR__;
$filePath = $frontendDir . $uri;

// If URI ends without extension and doesn't map to a file, check if adding .html helps (clean urls)
if (!file_exists($filePath) && !pathinfo($filePath, PATHINFO_EXTENSION)) {
    if (file_exists($filePath . '.html')) {
        $filePath .= '.html';
    }
}

// If path maps to a directory, check for index.html
if (is_dir($filePath)) {
    $filePath = rtrim($filePath, '/') . '/index.html';
}

// If file exists inside the frontend directory, serve it with proper content types
if (file_exists($filePath) && is_file($filePath)) {
    $ext = pathinfo($filePath, PATHINFO_EXTENSION);
    $mimeTypes = [
        'html' => 'text/html',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'json' => 'application/json',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
    ];
    $mimeType = isset($mimeTypes[$ext]) ? $mimeTypes[$ext] : 'application/octet-stream';
    header("Content-Type: {$mimeType}");
    readfile($filePath);
    exit;
}

// 3. Custom 404 Fallback routing
$notFoundPage = $frontendDir . '/404.html';
if (file_exists($notFoundPage)) {
    header("HTTP/1.1 404 Not Found");
    header("Content-Type: text/html");
    readfile($notFoundPage);
    exit;
}

return false;
