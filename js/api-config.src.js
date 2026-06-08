/**
 * api-config.js — VANIX STUDIO
 * Auto-detects the API base URL.
 * - In production (FastAPI serves frontend):  uses relative "" so /api/... resolves to the same origin
 * - In local development (Live Server on 5500): uses http://localhost:8000
 *
 * Include this BEFORE any script that uses `API`.
 */
(function() {
    const host = window.location.hostname;
    const port = window.location.port;
    const isLocalDev = (host === 'localhost' || host === '127.0.0.1') && port !== '8000';

    // ─── DEPLOYMENT SETTING ───
    // CASE A: If hosting BOTH frontend and backend on the same Hostinger VPS, leave this as ''.
    // CASE B: If hosting frontend on Hostinger Shared Hosting (public_html) and backend on another service 
    //         (like Render/Railway/subdomain), set this to your live API URL (e.g. 'https://api.vanix.co.in' or your Render URL).
    const PROD_BACKEND_URL = ''; 

    window.API_BASE = isLocalDev ? 'http://localhost:8000' : PROD_BACKEND_URL;

    // Also expose as window.API for backward compat
    window.API = window.API_BASE;
})();
