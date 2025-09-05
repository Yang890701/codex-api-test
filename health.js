// 健康檢查端點
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        env: {
            nodeVersion: process.version,
            platform: process.platform,
            codexApiKey: !!process.env.CODEX_API_KEY
        }
    });
});

module.exports = router;