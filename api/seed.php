<?php
/**
 * seed.php — Database table creator and Super Admin seeder
 */

header('Content-Type: text/plain');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

try {
    $pdo = getDbConnection();
    
    // Read schema file
    $schemaPath = __DIR__ . '/../database/schema_mysql.sql';
    if (!file_exists($schemaPath)) {
        throw new Exception("Schema file not found at " . $schemaPath);
    }
    
    $schemaSql = file_get_contents($schemaPath);
    
    echo "[*] Initializing MySQL tables...\n";
    
    // Multiple queries in one exec statement are supported by PDO MySQL
    $pdo->exec($schemaSql);
    
    // Explicitly alter login_logs role enum to support student if it doesn't already
    try {
        $pdo->exec("ALTER TABLE login_logs MODIFY COLUMN role ENUM('user', 'employee', 'admin', 'super_admin', 'student') NOT NULL");
        echo "[+] login_logs role column enum updated successfully.\n";
    } catch (Exception $alterEx) {
        // Ignored if it fails or column doesn't exist yet (though it should)
        echo "[*] Notice: login_logs role column enum update attempt completed.\n";
    }
    
    echo "[+] Database schema verified / created successfully.\n";
    
    // Seed Super Admin
    $email = getenv("SUPER_ADMIN_EMAIL") ?: "vanixuniversal@gmail.com";
    $password = getenv("SUPER_ADMIN_PASSWORD") ?: "VNX@SuperAdmin#2025";
    
    $stmt = $pdo->prepare("SELECT id FROM super_admins WHERE email = ?");
    $stmt->execute([$email]);
    $existing = $stmt->fetch();
    
    if (!$existing) {
        $hashed = hash_password($password);
        $stmt = $pdo->prepare("INSERT INTO super_admins (email, password_hash, name) VALUES (?, ?, 'Super Administrator')");
        $stmt->execute([$email, $hashed]);
        echo "[+] Super Admin seeded successfully: {$email}\n";
    } else {
        echo "[*] Super Admin already exists: {$email}\n";
    }
    
    echo "[+] Database setup completed successfully!\n";
    
} catch (Exception $e) {
    echo "[-] Error during database setup: " . $e->getMessage() . "\n";
    exit(1);
}
