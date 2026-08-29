// Vercel Serverless Endpoint: /api/github-sync (Alias for saveConfig.js)
import saveConfigHandler from './saveConfig.js';

export default async function handler(req, res) {
    return saveConfigHandler(req, res);
}
