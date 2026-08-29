// Vercel Serverless Endpoint: /api/admin-auth
// Checks credentials securely against environment variables (ADMIN_PASSWORD or ADMIN_PASSWORD_HASH)
const crypto = require('crypto');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }
        
        const password = body ? body.password : null;

        if (!password || typeof password !== 'string') {
            return res.status(400).json({ success: false, message: 'Security key parameter missing.' });
        }

        // Check against environment variables set in Vercel Console / .env
        const envPassword = process.env.ADMIN_PASSWORD;
        const envHash = process.env.ADMIN_PASSWORD_HASH;
        
        // SHA-256 of default baseline password "admin123"
        const defaultBaselineHash = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

        const inputHash = crypto.createHash('sha256').update(password).digest('hex');

        let isValid = false;

        if (envHash && envHash.trim().length > 0) {
            isValid = (inputHash.toLowerCase() === envHash.trim().toLowerCase());
        } else if (envPassword && envPassword.trim().length > 0) {
            isValid = (password === envPassword.trim());
        } else {
            // Fallback to baseline default SHA-256 hash
            isValid = (inputHash.toLowerCase() === defaultBaselineHash);
        }

        if (isValid) {
            // Generate cryptographically secure session token
            const sessionToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = Date.now() + (4 * 60 * 60 * 1000); // 4 Hours Expiration

            return res.status(200).json({
                success: true,
                message: 'Authentication successful.',
                token: sessionToken,
                expiresAt: expiresAt
            });
        } else {
            // Constant time delay to prevent timing analysis attacks
            await new Promise(r => setTimeout(r, 450));
            return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
        }
    } catch (err) {
        console.error("Auth server error:", err);
        return res.status(500).json({ success: false, message: 'Server error processing authentication.' });
    }
};
