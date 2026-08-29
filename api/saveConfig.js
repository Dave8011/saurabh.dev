// Vercel Serverless Endpoint: /api/saveConfig (Exact mr.b-website pattern)
// Commits site_data.json to GitHub using process.env.GITHUB_TOKEN / GITHUB_PAT

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }

        const configData = body ? (body.configData || body.data) : null;
        if (!configData || typeof configData !== 'object') {
            return res.status(400).json({ error: 'Missing config data payload.' });
        }

        const owner = (process.env.GITHUB_OWNER || 'SaurabhDave8').trim();
        const repo = (process.env.GITHUB_REPO || 'saurabh.dev').trim();
        const githubToken = (process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || process.env.ADMIN_GITHUB_PAT || process.env.GH_PAT || process.env.TOKEN || '').trim();
        const path = 'site_data.json';

        if (!githubToken) {
            return res.status(500).json({
                error: 'Server Configuration Error: Missing GITHUB_TOKEN or GITHUB_PAT environment variable in Vercel settings.'
            });
        }

        // Fetch current file SHA if exists
        let sha = body.sha || null;
        if (!sha) {
            try {
                const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'User-Agent': 'Vercel-Admin-Panel',
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                if (getRes.ok) {
                    const fileData = await getRes.json();
                    sha = fileData.sha || null;
                }
            } catch (e) {}
        }

        // Base64 encode the content
        const content = Buffer.from(JSON.stringify(configData, null, 2), 'utf-8').toString('base64');

        const payload = {
            message: `admin: update site_data.json via Admin Panel [${new Date().toISOString()}]`,
            content: content
        };

        if (sha) {
            payload.sha = sha;
        }

        const githubRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'Vercel-Admin-Panel',
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(payload)
        });

        if (!githubRes.ok) {
            const err = await githubRes.json();
            throw new Error(err.message || 'GitHub API Error');
        }

        const data = await githubRes.json();
        return res.status(200).json({ success: true, newSha: data.content ? data.content.sha : null });
    } catch (e) {
        console.error('Vercel saveConfig error:', e);
        return res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
}
