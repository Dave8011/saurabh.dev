// Vercel Serverless Endpoint: /api/saveConfig
// Securely commits site_data.json to GitHub using Vercel Environment Variables:
// Owner: Dave8011, Repo: saurabh.dev
// Token: GITHUB_PAT, GITHUB_TOKEN, MY_SCRIBAX_TOKEN, ADMIN_GITHUB_PAT, GH_PAT, TOKEN

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }

        const configData = body ? (body.configData || body.data || body.content) : null;
        if (!configData) {
            return res.status(400).json({ error: 'Missing content or configData' });
        }

        // Read token from environment variables
        const token = (
            process.env.GITHUB_PAT ||
            process.env.GITHUB_TOKEN ||
            process.env.ADMIN_GITHUB_PAT ||
            process.env.MY_SCRIBAX_TOKEN ||
            process.env.GH_PAT ||
            process.env.TOKEN ||
            ''
        ).trim();

        // Exact GitHub Owner & Repo for Dave8011/saurabh.dev
        const owner = (process.env.GITHUB_OWNER || 'Dave8011').trim();
        const repo = (process.env.GITHUB_REPO || 'saurabh.dev').trim();
        const path = (body.path || 'site_data.json').trim();
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

        if (!token) {
            return res.status(500).json({
                error: 'Server Configuration Error: GITHUB_PAT or GITHUB_TOKEN environment variable missing in Vercel.'
            });
        }

        // 1. Fetch current file SHA if exists
        let sha = body.sha || undefined;
        if (!sha) {
            try {
                const getRes = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `token ${token}`,
                        'User-Agent': 'Vercel-Admin-Panel',
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                if (getRes.ok) {
                    const data = await getRes.json();
                    sha = data.sha;
                }
            } catch (e) {}
        }

        // 2. Base64 encode site_data.json content
        const contentStr = typeof configData === 'string' ? configData : JSON.stringify(configData, null, 2);
        const base64Content = Buffer.from(contentStr, 'utf-8').toString('base64');

        // 3. Put updated file to GitHub repo Dave8011/saurabh.dev
        const saveRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'Vercel-Admin-Panel',
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Update site_data.json via Admin Panel [${new Date().toISOString()}]`,
                content: base64Content,
                ...(sha ? { sha } : {})
            })
        });

        const result = await saveRes.json();
        if (!saveRes.ok) {
            return res.status(saveRes.status || 500).json({ error: result.message || 'GitHub API Error' });
        }

        return res.status(200).json({
            success: true,
            message: `✅ Saved: ${path}`,
            newSha: result.content ? result.content.sha : null
        });

    } catch (error) {
        console.error('Vercel GitHub push error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
