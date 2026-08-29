// Vercel Serverless Endpoint: /api/push-file (Direct ScribaX pattern endpoint)
import saveConfigHandler from './saveConfig.js';

export default async function handler(req, res) {
    return saveConfigHandler(req, res);
}
