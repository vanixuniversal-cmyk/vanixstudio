<?php
/**
 * mail.php — Gmail SMTP and PHP mail() notifications for VANIX STUDIO
 */

require_once __DIR__ . '/config.php';

/**
 * Send an email using SMTP (if configured) or native mail()
 */
function send_email($to, $subject, $html_body) {
    $gmail_user = getenv('GMAIL_USER') ?: 'vanixuniversal@gmail.com';
    $gmail_pass = getenv('GMAIL_APP_PASSWORD');

    // If SMTP credentials are not configured, fallback to standard PHP mail()
    if (empty($gmail_pass) || $gmail_pass === 'your_gmail_app_password_here' || $gmail_pass === 'xxxx xxxx xxxx xxxx') {
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=utf-8\r\n";
        $headers .= "From: VANIX STUDIO <" . $gmail_user . ">\r\n";
        return mail($to, $subject, $html_body, $headers);
    }

    try {
        $smtp = fsockopen("ssl://smtp.gmail.com", 465, $errno, $errstr, 10);
        if (!$smtp) {
            throw new Exception("Could not connect to SMTP server: $errstr ($errno)");
        }

        // Inline reader helper
        $readResponse = function($smtp, $expected) {
            $response = "";
            while ($line = fgets($smtp, 515)) {
                $response .= $line;
                if (substr($line, 3, 1) == " ") {
                    break;
                }
            }
            if (substr($response, 0, 3) !== (string)$expected) {
                throw new Exception("SMTP Error: " . trim($response));
            }
            return $response;
        };

        $readResponse($smtp, 220);

        fwrite($smtp, "EHLO localhost\r\n");
        $readResponse($smtp, 250);

        fwrite($smtp, "AUTH LOGIN\r\n");
        $readResponse($smtp, 334);

        fwrite($smtp, base64_encode($gmail_user) . "\r\n");
        $readResponse($smtp, 334);

        fwrite($smtp, base64_encode($gmail_pass) . "\r\n");
        $readResponse($smtp, 235);

        fwrite($smtp, "MAIL FROM: <{$gmail_user}>\r\n");
        $readResponse($smtp, 250);

        fwrite($smtp, "RCPT TO: <{$to}>\r\n");
        $readResponse($smtp, 250);

        fwrite($smtp, "DATA\r\n");
        $readResponse($smtp, 354);

        $headers = "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
        $headers .= "To: {$to}\r\n";
        $headers .= "From: VANIX STUDIO <{$gmail_user}>\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";

        fwrite($smtp, $headers . $html_body . "\r\n.\r\n");
        $readResponse($smtp, 250);

        fwrite($smtp, "QUIT\r\n");
        fclose($smtp);
        return true;
    } catch (Exception $e) {
        error_log("SMTP Mail send failed to {$to}: " . $e->getMessage());
        // Fallback to PHP native mail() as last resort
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=utf-8\r\n";
        $headers .= "From: VANIX STUDIO <{$gmail_user}>\r\n";
        return mail($to, $subject, $html_body, $headers);
    }
}

/**
 * Base email layout wrapper
 */
function _base_template($content) {
    return '
    <div style="background:#0a0a0a;font-family:\'Helvetica Neue\',sans-serif;padding:40px 20px;min-height:100vh;">
      <div style="max-width:600px;margin:0 auto;background:#111;border:1px solid rgba(255,0,0,0.2);border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a0000,#0a0a0a);padding:30px 35px;border-bottom:1px solid rgba(255,0,0,0.15);">
          <div style="font-size:28px;font-weight:900;letter-spacing:4px;color:#fff;">
            VANIX <span style="color:#ff0000;">STUDIO</span>
          </div>
          <div style="font-size:10px;letter-spacing:3px;color:rgba(255,0,0,0.6);margin-top:4px;">AI CINEMATIC PRODUCTION SYSTEM</div>
        </div>
        <div style="padding:35px;">
          ' . $content . '
        </div>
        <div style="padding:20px 35px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
          <p style="font-size:11px;color:rgba(255,255,255,0.2);margin:0;">
            © 2026 VANIX STUDIO · Automated Notification · Do not reply
          </p>
        </div>
      </div>
    </div>';
}

// ─── Email Trigger Functions ──────────────────────────────────

function send_new_user_registered($admin_email, $user_name, $user_email) {
    $subject = "🎬 New User Registered — {$user_name}";
    $dateStr = gmdate('Y-m-d H:i:s') . ' UTC';
    $content = "
      <h2 style=\"color:#fff;margin:0 0 8px;\">New User Registration</h2>
      <p style=\"color:rgba(255,255,255,0.5);margin:0 0 25px;font-size:13px;\">A new client has joined the VANIX ecosystem.</p>
      <div style=\"background:rgba(255,255,255,0.03);border:1px solid rgba(255,0,0,0.15);border-radius:10px;padding:20px;margin-bottom:20px;\">
        <p style=\"color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 6px;\">NAME</p>
        <p style=\"color:#fff;font-size:16px;font-weight:600;margin:0 0 16px;\">{$user_name}</p>
        <p style=\"color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 6px;\">EMAIL</p>
        <p style=\"color:#ff0000;font-size:14px;margin:0 0 16px;\">{$user_email}</p>
        <p style=\"color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 6px;\">TIME</p>
        <p style=\"color:#fff;font-size:13px;margin:0;\">{$dateStr}</p>
      </div>";
    return send_email($admin_email, $subject, _base_template($content));
}

function send_user_login_alert($admin_email, $user_name, $user_email, $ip) {
    $subject = "✅ User Login — {$user_name}";
    $dateStr = gmdate('Y-m-d H:i:s') . ' UTC';
    $ipStr = $ip ? $ip : 'Unknown';
    $content = "
      <h2 style=\"color:#fff;margin:0 0 8px;\">User Login Detected</h2>
      <p style=\"color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 25px;\">A registered client has signed in.</p>
      <div style=\"background:rgba(0,255,100,0.03);border:1px solid rgba(0,255,100,0.15);border-radius:10px;padding:20px;\">
        <p style=\"color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;\">CLIENT</p>
        <p style=\"color:#00ff64;font-size:16px;font-weight:600;margin:0 0 12px;\">{$user_name} &lt;{$user_email}&gt;</p>
        <p style=\"color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;\">TIME</p>
        <p style=\"color:#fff;font-size:13px;margin:0 0 12px;\">{$dateStr}</p>
        <p style=\"color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;\">IP ADDRESS</p>
        <p style=\"color:#fff;font-size:13px;margin:0;\">{$ipStr}</p>
      </div>";
    return send_email($admin_email, $subject, _base_template($content));
}

function send_employee_login_alert($admin_email, $emp_name, $emp_email, $dept, $ip) {
    $subject = "🔧 Employee Login — {$emp_name}";
    $dateStr = gmdate('Y-m-d H:i:s') . ' UTC';
    $ipStr = $ip ? $ip : 'Unknown';
    $content = "
      <h2 style=\"color:#fff;margin:0 0 8px;\">Employee Login Detected</h2>
      <p style=\"color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 25px;\">A team member has accessed the production portal.</p>
      <div style=\"background:rgba(255,0,0,0.03);border:1px solid rgba(255,0,0,0.15);border-radius:10px;padding:20px;\">
        <p style=\"color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;\">EMPLOYEE</p>
        <p style=\"color:#ff0000;font-size:16px;font-weight:600;margin:0 0 12px;\">{$emp_name} &lt;{$emp_email}&gt;</p>
        <p style=\"color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;\">DEPARTMENT</p>
        <p style=\"color:#fff;font-size:13px;margin:0 0 12px;\">{$dept}</p>
        <p style=\"color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;\">TIME</p>
        <p style=\"color:#fff;font-size:13px;margin:0 0 12px;\">{$dateStr}</p>
        <p style=\"color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;\">IP ADDRESS</p>
        <p style=\"color:#fff;font-size:13px;margin:0;\">{$ipStr}</p>
      </div>";
    return send_email($admin_email, $subject, _base_template($content));
}

function send_employee_welcome($emp_email, $emp_name, $dept, $password, $invite_code) {
    $subject = "⚡ Welcome to VANIX STUDIO — Your Access Credentials";
    $content = "
      <h2 style=\"color:#fff;margin:0 0 8px;\">Welcome to VANIX STUDIO</h2>
      <p style=\"color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 25px;\">Your corporate account has been created by an administrator.</p>
      <div style=\"background:rgba(255,0,0,0.03);border:1px solid rgba(255,0,0,0.2);border-radius:10px;padding:20px;margin-bottom:16px;\">
        <p style=\"color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;\">YOUR NAME</p>
        <p style=\"color:#fff;font-size:16px;font-weight:600;margin:0 0 14px;\">{$emp_name}</p>
        <p style=\"color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;\">DEPARTMENT</p>
        <p style=\"color:#fff;font-size:13px;margin:0 0 14px;\">{$dept}</p>
        <p style=\"color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;\">TEMPORARY PASSWORD</p>
        <p style=\"color:#ff0000;font-size:18px;font-weight:800;letter-spacing:2px;margin:0 0 14px;\">{$password}</p>
        <p style=\"color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;\">INVITE CODE</p>
        <p style=\"color:#ff0000;font-size:16px;font-weight:700;margin:0;\">{$invite_code}</p>
      </div>
      <p style=\"color:rgba(255,165,0,0.8);font-size:12px;\">⚠ Please change your password after first login. Keep your credentials confidential.</p>";
    return send_email($emp_email, $subject, _base_template($content));
}

function send_leave_request_alert($admin_email, $emp_name, $leave_type, $start, $end, $reason) {
    $subject = "📋 Leave Request — {$emp_name}";
    $leaveTypeUpper = strtoupper($leave_type);
    $reasonStr = $reason ? $reason : 'No reason provided';
    $content = "
      <h2 style=\"color:#fff;margin:0 0 8px;\">Leave Request Submitted</h2>
      <p style=\"color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 25px;\">An employee has submitted a leave application requiring your review.</p>
      <div style=\"background:rgba(255,165,0,0.03);border:1px solid rgba(255,165,0,0.2);border-radius:10px;padding:20px;\">
        <p style=\"color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;\">EMPLOYEE</p>
        <p style=\"color:#fff;font-size:16px;font-weight:600;margin:0 0 12px;\">{$emp_name}</p>
        <p style=\"color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;\">TYPE</p>
        <p style=\"color:#ffa500;font-size:13px;margin:0 0 12px;\">{$leaveTypeUpper} LEAVE</p>
        <p style=\"color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;\">PERIOD</p>
        <p style=\"color:#fff;font-size:13px;margin:0 0 12px;\">{$start} → {$end}</p>
        <p style=\"color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;\">REASON</p>
        <p style=\"color:#fff;font-size:13px;margin:0;\">{$reasonStr}</p>
      </div>";
    return send_email($admin_email, $subject, _base_template($content));
}

function send_leave_decision($emp_email, $emp_name, $leave_type, $status, $note) {
    $color = ($status == "approved") ? "#00ff64" : "#ff0000";
    $emoji = ($status == "approved") ? "✅" : "❌";
    $leaveTypeCap = ucfirst($leave_type);
    $statusCap = ucfirst($status);
    $subject = "{$emoji} Your {$leaveTypeCap} Leave has been {$statusCap}";
    $statusUpper = strtoupper($status);
    $noteStr = $note ? $note : 'No additional notes.';
    $content = "
      <h2 style=\"color:#fff;margin:0 0 8px;\">Leave Application Update</h2>
      <p style=\"color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 25px;\">Hi {$emp_name}, your leave application has been reviewed.</p>
      <div style=\"background:rgba(255,255,255,0.02);border:1px solid {$color}33;border-radius:10px;padding:20px;text-align:center;\">
        <p style=\"font-size:40px;margin:0 0 10px;\">{$emoji}</p>
        <p style=\"color:{$color};font-size:22px;font-weight:800;letter-spacing:2px;margin:0 0 12px;\">{$statusUpper}</p>
        <p style=\"color:rgba(255,255,255,0.6);font-size:13px;margin:0;\">{$noteStr}</p>
      </div>";
    return send_email($emp_email, $subject, _base_template($content));
}

function send_contact_message_received($admin_email, $sender_name, $sender_email, $sender_phone, $service, $details) {
    $subject = "✉ New Message from {$sender_name} — " . ($service ? $service : 'General Inquiry');
    $phoneStr = $sender_phone ? $sender_phone : 'Not provided';
    $serviceStr = $service ? $service : 'Not provided';
    $content = "
      <h2 style=\"color:#fff;margin:0 0 8px;\">Incoming Client Inquiry</h2>
      <p style=\"color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 25px;\">A user has submitted details via the Contact form.</p>
      <div style=\"background:rgba(255,0,0,0.03);border:1px solid rgba(255,0,0,0.15);border-radius:10px;padding:20px;margin-bottom:16px;\">
        <p style=\"color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;\">SENDER NAME</p>
        <p style=\"color:#fff;font-size:16px;font-weight:600;margin:0 0 14px;\">{$sender_name}</p>
        <p style=\"color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;\">EMAIL</p>
        <p style=\"color:#ff0000;font-size:14px;margin:0 0 14px;\">{$sender_email}</p>
        <p style=\"color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;\">PHONE</p>
        <p style=\"color:#fff;font-size:14px;margin:0 0 14px;\">{$phoneStr}</p>
        <p style=\"color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;\">SERVICE OF INTEREST</p>
        <p style=\"color:#fff;font-size:14px;font-weight:600;margin:0 0 14px;\">{$serviceStr}</p>
        <p style=\"color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 4px;\">PROJECT DETAILS</p>
        <p style=\"color:#fff;font-size:13px;line-height:1.6;white-space:pre-wrap;background:rgba(255,255,255,0.02);padding:12px;border-radius:6px;border:1px solid rgba(255,255,255,0.05);margin:0;\">" . htmlspecialchars($details) . "</p>
      </div>";
    return send_email($admin_email, $subject, _base_template($content));
}
