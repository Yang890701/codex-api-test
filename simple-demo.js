require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 簡化的 API 測試
async function testDefinedAPI() {
    try {
        const response = await axios.post('https://graph.defined.fi/graphql', {
            query: `
                query {
                    getTokens(
                        input: {
                            networkFilter: [1]
                            searchQuery: "ETH"
                            limit: 1
                        }
                    ) {
                        address
                        name
                        symbol
                        networkId
                    }
                }
            `
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CODEX_API_KEY}`
            }
        });

        return response.data;
    } catch (error) {
        return { error: error.message, response: error.response?.data };
    }
}

app.get('/', (req, res) => {
    res.send(`
        <h1>🔍 Defined.fi API 測試</h1>
        <p>✅ 服務器運行正常</p>
        <p>🔑 API Key: ${process.env.CODEX_API_KEY ? '已設置' : '未設置'}</p>
        <a href="/test">測試 Defined.fi API</a>
        <br><br>
        <a href="/simple">簡單測試</a>
    `);
});

app.get('/test', async (req, res) => {
    const result = await testDefinedAPI();
    res.json(result);
});

app.get('/simple', async (req, res) => {
    // 最簡單的測試
    try {
        const response = await axios.get('https://httpbin.org/json');
        res.json({
            success: true,
            message: '網路連接正常',
            data: response.data
        });
    } catch (error) {
        res.json({
            success: false,
            message: error.message
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

module.exports = app;