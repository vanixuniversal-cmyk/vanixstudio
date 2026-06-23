-- VANIX STUDIO MySQL Database Schema
-- Optimized for standard shared hosting MySQL/MariaDB

-- ─── Super Admin Table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS super_admins (
    id INT AUTO_INCREMENT NOT NULL, 
    email VARCHAR(255) NOT NULL UNIQUE, 
    password_hash VARCHAR(255) NOT NULL, 
    name VARCHAR(255) DEFAULT 'Super Administrator', 
    is_active BOOLEAN DEFAULT TRUE, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY (id),
    INDEX ix_super_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Admin Table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT NOT NULL, 
    name VARCHAR(255) NOT NULL, 
    email VARCHAR(255) NOT NULL UNIQUE, 
    password_hash VARCHAR(255) NOT NULL, 
    is_active BOOLEAN DEFAULT TRUE, 
    created_by_sa INT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY (id),
    CONSTRAINT fk_admins_created_by_sa FOREIGN KEY (created_by_sa) REFERENCES super_admins (id) ON DELETE SET NULL,
    INDEX ix_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Users Table (Public Clients) ─────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT NOT NULL, 
    name VARCHAR(255) NOT NULL, 
    email VARCHAR(255) NOT NULL UNIQUE, 
    password_hash VARCHAR(255) NOT NULL, 
    phone VARCHAR(50),
    interests TEXT, 
    theme_preference VARCHAR(50) DEFAULT 'crimson',
    is_active BOOLEAN DEFAULT TRUE, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY (id),
    INDEX ix_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Employees Table (Staff) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT NOT NULL, 
    name VARCHAR(255) NOT NULL, 
    email VARCHAR(255) NOT NULL UNIQUE, 
    password_hash VARCHAR(255) NOT NULL, 
    plain_password VARCHAR(255) DEFAULT NULL, 
    department VARCHAR(100) NOT NULL, 
    invite_code VARCHAR(20), 
    is_active BOOLEAN DEFAULT TRUE, 
    status VARCHAR(50) DEFAULT 'Active',
    created_by_admin INT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY (id),
    CONSTRAINT fk_employees_created_by_admin FOREIGN KEY (created_by_admin) REFERENCES admins (id) ON DELETE SET NULL,
    INDEX ix_employees_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Attendance Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT NOT NULL, 
    employee_id INT NOT NULL, 
    date DATE NOT NULL, 
    clock_in DATETIME, 
    clock_out DATETIME, 
    hours_worked FLOAT DEFAULT 0.0, 
    status ENUM('present', 'half_day', 'absent') DEFAULT 'absent', 
    PRIMARY KEY (id),
    CONSTRAINT fk_attendance_employee_id FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Leaves Table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaves (
    id INT AUTO_INCREMENT NOT NULL, 
    employee_id INT NOT NULL, 
    leave_type ENUM('annual', 'sick', 'emergency') NOT NULL, 
    start_date DATE NOT NULL, 
    end_date DATE NOT NULL, 
    reason TEXT, 
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending', 
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    reviewed_by INT, 
    reviewed_at DATETIME, 
    review_note TEXT, 
    PRIMARY KEY (id),
    CONSTRAINT fk_leaves_employee_id FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Login Logs Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_logs (
    id INT AUTO_INCREMENT NOT NULL, 
    role ENUM('user', 'employee', 'admin', 'super_admin', 'student') NOT NULL,  
    user_id INT, 
    employee_id INT, 
    admin_id INT, 
    login_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    logout_at DATETIME, 
    ip_address VARCHAR(50), 
    user_agent TEXT, 
    actor_name VARCHAR(255), 
    actor_email VARCHAR(255), 
    PRIMARY KEY (id),
    CONSTRAINT fk_login_logs_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_login_logs_employee_id FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
    CONSTRAINT fk_login_logs_admin_id FOREIGN KEY (admin_id) REFERENCES admins (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Site Visits Table (Analytics) ────────────────────────────
CREATE TABLE IF NOT EXISTS site_visits (
    id INT AUTO_INCREMENT NOT NULL, 
    page VARCHAR(255), 
    referrer VARCHAR(512),
    time_spent_seconds INT DEFAULT 0,
    ip_address VARCHAR(50), 
    user_agent TEXT, 
    visited_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Contact Messages Table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    service VARCHAR(100),
    details TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Portfolio Projects Table (CMS) ───────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_projects (
    id INT AUTO_INCREMENT NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(512),
    video_url VARCHAR(512),
    tags TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX ix_portfolio_projects_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Chat Messages Table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT NOT NULL,
    sender_role ENUM('user', 'employee', 'admin', 'super_admin') NOT NULL,
    sender_id INT NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Bulletins Table (Announcements) ────────────────────────────
CREATE TABLE IF NOT EXISTS bulletins (
    id INT AUTO_INCREMENT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type ENUM('critical', 'success', 'info', 'warning') DEFAULT 'info',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Training Students Table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_students (
    id INT AUTO_INCREMENT NOT NULL,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    plain_password VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Recording Classes Table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS recording_classes (
    id INT AUTO_INCREMENT NOT NULL,
    title VARCHAR(255) NOT NULL,
    video_url VARCHAR(512) NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    notes_url VARCHAR(512) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Class Feedback Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_feedback (
    id INT AUTO_INCREMENT NOT NULL,
    class_id INT NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_feedback_class FOREIGN KEY (class_id) REFERENCES recording_classes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─── Training Tasks Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_tasks (
    id INT AUTO_INCREMENT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    text_content TEXT,
    reward_amount DECIMAL(10, 2) DEFAULT 0.00,
    deadline DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Student Tasks Table (Submissions & Earnings) ──────────────────
CREATE TABLE IF NOT EXISTS student_tasks (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Task Bids Table (Marketplace Proposals) ──────────────────────
CREATE TABLE IF NOT EXISTS task_bids (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
