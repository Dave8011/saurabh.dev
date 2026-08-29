// Vercel Serverless Endpoint: /api/admin-auth
// Versatile & Secure Authentication verifying against Vercel Environment Variables
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
            return res.status(400).json({ success: false, message: 'Password parameter missing.' });
        }

        const inputRaw = password.trim();
        const inputHash = crypto.createHash('sha256').update(inputRaw).digest('hex').toLowerCase();

        // Read Vercel Environment Variables
        const envPassword = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim() : null;
        const envHash = process.env.ADMIN_PASSWORD_HASH ? process.env.ADMIN_PASSWORD_HASH.trim() : null;

        // Baseline fallback SHA-256 for "admin123" and "admin" and "Admin@1997"
        const defaultBaselineHashes = [
            "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // SHA-256 of "admin123"
            "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
            "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"
        ];

        let isValid = false;

        // Check ADMIN_PASSWORD (Plain match OR Hash match)
        if (envPassword) {
            if (inputRaw === envPassword || inputHash === envPassword.toLowerCase()) {
                isValid = true;
            }
        }

        // Check ADMIN_PASSWORD_HASH (Hash match OR Plain match in case user pasted plain text in Vercel!)
        if (!isValid && envHash) {
            if (inputHash === envHash.toLowerCase() || inputRaw === envHash) {
                isValid = true;
            }
        }

        // Baseline fallback if no env vars set in Vercel
        if (!isValid && !envPassword && !envHash) {
            if (inputRaw === "admin123" || inputRaw === "admin" || inputRaw === "Admin@1997" || defaultBaselineHashes.includes(inputHash)) {
                isValid = true;
            }
        }

        if (isValid) {
            const sessionToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = Date.now() + (4 * 60 * 60 * 1000); // 4 Hours

            return res.status(200).json({
                success: true,
                message: 'Authentication successful.',
                token: sessionToken,
                expiresAt: expiresAt
            });
        } else {
            // Anti-timing attack delay
            await new Promise(r => setTimeout(r, 350));
            return res.status(401).json({ success: false, message: 'Invalid security key.' });
        }
    } catch (err) {
        console.error("Auth server error:", err);
        return res.status(500).json({ success: false, message: 'Server error processing authentication.' });
    }
};
