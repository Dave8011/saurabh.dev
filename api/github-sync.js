// Vercel Serverless Endpoint: /api/github-sync (mr.b-website pattern alias)
// Securely commits site_data.json to GitHub using Vercel Environment Variables:
// GITHUB_PAT (or GITHUB_TOKEN or ADMIN_GITHUB_PAT or GH_PAT)
// GITHUB_OWNER (default: SaurabhDave8)
// GITHUB_REPO (default: saurabh.dev)

const saveConfigHandler = require('./saveConfig.js');

module.exports = async (req, res) => {
    return saveConfigHandler(req, res);
};
