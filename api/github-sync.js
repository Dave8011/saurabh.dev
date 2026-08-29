// Vercel Serverless Endpoint: /api/github-sync
// Securely commits site_data.json to GitHub using Vercel Environment Variables:
// GITHUB_PAT (or ADMIN_GITHUB_PAT or GH_PAT)
// GITHUB_OWNER (default: SaurabhDave8)
// GITHUB_REPO (default: saurabh.dev)

const https = require('https');

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

        const siteData = body ? body.data : null;
        if (!siteData || typeof siteData !== 'object') {
            return res.status(400).json({ success: false, error: 'Missing site data payload.' });
        }

        // Read environment variables securely
        const pat = (process.env.GITHUB_PAT || process.env.ADMIN_GITHUB_PAT || process.env.GH_PAT || '').trim();
        const owner = (process.env.GITHUB_OWNER || 'SaurabhDave8').trim();
        const repo = (process.env.GITHUB_REPO || 'saurabh.dev').trim();

        if (!pat) {
            return res.status(500).json({
                success: false,
                error: 'GITHUB_PAT environment variable is not set in Vercel project settings.'
            });
        }

        const filePath = 'site_data.json';
        const fileContentBase64 = Buffer.from(JSON.stringify(siteData, null, 2)).toString('base64');

        // Helper function for GitHub HTTPS API calls
        function githubApiRequest(method, path, dataPayload = null) {
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'api.github.com',
                    path: path,
                    method: method,
                    headers: {
                        'User-Agent': 'Vercel-Serverless-Function',
                        'Authorization': `token ${pat}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    }
                };

                const request = https.request(options, (response) => {
                    let resData = '';
                    response.on('data', chunk => resData += chunk);
                    response.on('end', () => {
                        try {
                            const parsed = JSON.parse(resData);
                            resolve({ status: response.statusCode, data: parsed });
                        } catch (e) {
                            resolve({ status: response.statusCode, data: resData });
                        }
                    });
                });

                request.on('error', err => reject(err));
                if (dataPayload) {
                    request.write(JSON.stringify(dataPayload));
                }
                request.end();
            });
        }

        // 1. Fetch current file SHA if exists
        let sha = null;
        try {
            const getRes = await githubApiRequest('GET', `/repos/${owner}/${repo}/contents/${filePath}`);
            if (getRes.status === 200 && getRes.data && getRes.data.sha) {
                sha = getRes.data.sha;
            }
        } catch (e) {}

        // 2. Commit updated site_data.json to GitHub
        const commitBody = {
            message: `admin: update site_data.json [${new Date().toISOString()}]`,
            content: fileContentBase64,
            ...(sha ? { sha } : {})
        };

        const putRes = await githubApiRequest('PUT', `/repos/${owner}/${repo}/contents/${filePath}`, commitBody);

        if (putRes.status === 200 || putRes.status === 201) {
            return res.status(200).json({
                success: true,
                message: 'Successfully committed site_data.json to GitHub repository.',
                commitSha: putRes.data.content ? putRes.data.content.sha : null
            });
        } else {
            return res.status(putRes.status || 500).json({
                success: false,
                error: putRes.data ? (putRes.data.message || putRes.data) : 'GitHub API Error'
            });
        }

    } catch (err) {
        console.error('Vercel GitHub sync error:', err);
        return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
};
