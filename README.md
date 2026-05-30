# VANIX STUDIO — PHP & MySQL Full-Stack Portal

This documentation outlines the architecture, configuration, and deployment details for the updated full-stack **VANIX STUDIO Portal** running on standard PHP + MySQL shared web hosting.

---

## 🗺️ Project Architecture Overview

```
                          Browser (HTML/CSS/JS)
                                    │
                         HTTP /api/... (Relative)
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  Apache / LiteSpeed Web Server                       │
│  ┌───────────────────────────────┐  ┌─────────────────────────────┐  │
│  │   Static File Serving         │  │   PHP Router (api/index.php)│  │
│  │  (Served directly from root)  │  │  (Rewritten via .htaccess)  │  │
│  └───────────────────────────────┘  └─────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │  PDO MySQL Connection
                                   ▼
                       ┌─────────────────────────┐
                       │    MySQL / MariaDB      │
                       │     (vanix_studio)      │
                       └─────────────────────────┘
```

1. **Frontend (Client-side)**: Built using pure vanilla HTML5, CSS3, and modern progressive JavaScript (located in `frontend/`). Static files are served directly by the web server (Apache/LiteSpeed) with no Node.js compilation required.
2. **Backend (Server-side)**: Built with secure modular PHP controllers located inside `api/`. Endpoint routing to `/api/*` is handled via Apache `.htaccess` rewrite rules mapping requests to a single entry point `api/index.php`.
3. **Database**: Standard relational MySQL or MariaDB database running natively on your hosting plan.

---

## 📁 Directory Structure

```
vanixstudio/
├── api/                        ← All PHP/API code lives here
│   ├── .htaccess               ← Apache rewrite rules for clean routes
│   ├── index.php               ← Unified router entry point & controllers (30+ routes)
│   ├── config.php              ← Environment loading (.env) & PDO MySQL connection
│   ├── auth.php                ← Timing-safe HS256 JWT & password routines (bcrypt)
│   ├── mail.php                ← Gmail SMTP socket connection & system alerts
│   ├── seed.php                ← Database bootstrap & Super Admin seeder
│   └── .env                    ← Secrets & database config (never commit!)
│
├── database/
│   └── schema_mysql.sql        ← MySQL DDL script (tables, enums, FKs & indexes)
│
├── frontend/                   ← Web portal pages & assets
│   ├── index.html              ← Homepage
│   ├── about.html              ← Studio team info
│   ├── services.html           ← Custom service listings
│   ├── films.html              ← Film portfolio showcases
│   ├── vfx.html                ← VFX showcases
│   ├── portfolio.html          ← Master portfolio filter grid
│   ├── contact.html            ← Contact message submission form
│   ├── login.html              ← Client dashboard login
│   ├── register.html           ← Self-registration form
│   ├── css/                    ← Design system & page styles
│   └── js/                     ← API configs & dashboard scripts
│
└── router.php                  ← Local development router for built-in PHP server
```

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file in the `api/` folder (or project root). It should match this configuration template:

```env
# Database connection string (supports mysql or postgres formats)
DATABASE_URL=mysql://db_username:db_password@localhost:3306/db_name

# JWT signing secret (use a long, random string in production)
JWT_SECRET_KEY=vanix_studio_super_secret_jwt_key_2025
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Super Admin credentials (seeded on setup)
SUPER_ADMIN_EMAIL=vanixuniversal@gmail.com
SUPER_ADMIN_PASSWORD=VNX@SuperAdmin#2025

# Gmail SMTP for notifications (Leave blank to use host's native mail() fallback)
GMAIL_USER=vanixuniversal@gmail.com
GMAIL_APP_PASSWORD=ttjlriwbkamxynpg

# CORS and Domains
FRONTEND_URL=http://localhost:5500
PROD_DOMAIN=vanix.co.in
ENV=development

# Firebase Web Client Configuration (For Google Sign-In)
FIREBASE_API_KEY=AIzaSyCbboR14h5_xVF4WBQRzyi4c0tb9ZCOd0g
FIREBASE_AUTH_DOMAIN=vanix-studio.firebaseapp.com
FIREBASE_PROJECT_ID=vanix-studio
FIREBASE_STORAGE_BUCKET=vanix-studio.firebasestorage.app
FIREBASE_APP_ID=1:460374534778:web:bc5e3733ecdc4ed2e0a9c3
FIREBASE_MESSAGING_SENDER_ID=460374534778
FIREBASE_MEASUREMENT_ID=G-SN2VJKG3K1
```

---

## 🚀 Running the Project Locally

No external web server (like Apache or Nginx) is needed to test locally. PHP has a built-in server that we configure using `router.php`:

1. Open a terminal in the `vanixstudio/` directory.
2. Start the development server:
   ```bash
   php -S localhost:8000 router.php
   ```
3. Open **`http://localhost:8000`** in your browser. The router serves the frontend pages correctly and maps all API requests to the PHP controller seamlessly.

---

## 📦 Production Deployment (Hostinger Shared Web Hosting)

To deploy the application directly onto Hostinger Shared Hosting:

1. **MySQL Database Setup**:
   - In Hostinger hPanel, go to **Databases** > **MySQL Databases**.
   - Create a new MySQL database, a user, and a secure password.
2. **Environment Variables**:
   - Create a `.env` file under the `/api/` folder.
   - Set the `DATABASE_URL` using the credentials created in Step 1:
     `DATABASE_URL=mysql://db_user:db_password@localhost:3306/db_name`
3. **Upload Base Files**:
   - Using Hostinger's **File Manager** (or FTP), upload the entire contents of the `frontend/` directory directly into the root `public_html/` folder (so `index.html` sits directly inside `public_html/`).
   - Upload the `/api/` folder containing the PHP files directly into `public_html/api/`.
4. **Initialize Database Tables**:
   - In your browser, navigate to your live domain setup script:
     **`https://vanix.co.in/api/seed.php`**
   - This script reads the `database/schema_mysql.sql` definitions, creates all 10 MySQL tables (using secure InnoDB engine constraints), and seeds your Super Admin credentials.
