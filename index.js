require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
        <h1>🚀 Codex API 測試</h1>
        <p>✅ 服務器運行正常</p>
        <p>🔑 API Key: ${process.env.CODEX_API_KEY ? '已設置' : '未設置'}</p>
        <a href="/test">測試 Codex API</a>
    `);
});

app.get('/test', async (req, res) => {
    if (!process.env.CODEX_API_KEY) {
        return res.json({ success: false, message: '請設置 CODEX_API_KEY' });
    }

    try {
        const response = await axios.post('https://api.codex.io/graphql', {
            query: 'query { filterTokens(phrase: "ETH", filters: { networkIds: [1] }, limit: 1) { nodes { address name symbol } } }'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CODEX_API_KEY
            }
        });

        res.json({
            success: true,
            message: 'Codex API 連接成功',
            data: response.data.data
        });
    } catch (error) {
        res.json({
            success: false,
            message: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

module.exports = app;