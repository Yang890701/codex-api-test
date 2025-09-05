require('dotenv').config();
const express = require('express');
const CodexClient = require('./codex-client');
const healthRouter = require('./health');

const app = express();
app.use(healthRouter);
const PORT = process.env.PORT || 3000;
const codexClient = new CodexClient(process.env.CODEX_API_KEY);

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🔍 加密貨幣交易者追蹤</title>
            <style>
                body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
                .form { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
                input, select, button { padding: 10px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; }
                button { background: #007bff; color: white; cursor: pointer; }
                .result { background: #e9ecef; padding: 15px; border-radius: 8px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <h1>🔍 加密貨幣交易者追蹤</h1>
            <p>✅ 服務器運行正常 | 🔑 API Key: ${process.env.CODEX_API_KEY ? '已設置' : '未設置'}</p>
            
            <div class="form">
                <h3>📊 查詢交易者</h3>
                <input type="text" id="token" placeholder="代幣名稱 (ETH, BTC...)" value="ETH">
                <input type="number" id="minAmount" placeholder="最小交易金額 (USD)" value="1000">
                <select id="network">
                    <option value="1">Ethereum</option>
                    <option value="56">BSC</option>
                </select>
                <button onclick="searchTraders()">🔍 查詢交易者</button>
            </div>
            
            <div id="results"></div>
            
            <script>
                async function searchTraders() {
                    const token = document.getElementById('token').value;
                    const minAmount = document.getElementById('minAmount').value;
                    const network = document.getElementById('network').value;
                    
                    document.getElementById('results').innerHTML = '<p>🔄 查詢中...</p>';
                    
                    try {
                        const response = await fetch(\`/api/traders?token=\${token}&minAmount=\${minAmount}&network=\${network}\`);
                        const data = await response.json();
                        
                        if (data.success) {
                            displayResults(data.data);
                        } else {
                            document.getElementById('results').innerHTML = \`<div class="result">❌ 錯誤: \${data.message}</div>\`;
                        }
                    } catch (error) {
                        document.getElementById('results').innerHTML = \`<div class="result">❌ 網路錯誤: \${error.message}</div>\`;
                    }
                }
                
                function displayResults(data) {
                    let html = \`<h3>📊 \${data.token.symbol} 交易者結果</h3>\`;
                    html += \`<p>💰 代幣: \${data.token.name} (\${data.token.symbol})</p>\`;
                    html += \`<p>🔗 地址: \${data.token.address}</p>\`;
                    html += \`<p>📈 找到 \${data.traders.length} 個大戶</p>\`;
                    
                    data.traders.forEach((trader, i) => {
                        html += \`
                            <div class="result">
                                <h4>🐳 第 \${i+1} 名交易者</h4>
                                <p>💼 錢包: <code>\${trader.wallet}</code></p>
                                <p>💵 總金額: $\${trader.totalUsd.toLocaleString()}</p>
                                <p>📈 交易次數: \${trader.orders}</p>
                                <p>💰 平均價格: $\${trader.avgPrice.toFixed(4)}</p>
                                <p>⏰ 交易時間: \${new Date(trader.firstTx * 1000).toLocaleString()} - \${new Date(trader.lastTx * 1000).toLocaleString()}</p>
                            </div>
                        \`;
                    });
                    
                    document.getElementById('results').innerHTML = html;
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/api/traders', async (req, res) => {
    const { token, minAmount = 1000, network = 1 } = req.query;
    
    if (!process.env.CODEX_API_KEY) {
        return res.json({ success: false, message: '請設置CODEX_API_KEY' });
    }
    
    if (!token) {
        return res.json({ success: false, message: '請輸入代幣名稱' });
    }
    
    try {
        // 1. 找到代幣
        const tokenInfo = await codexClient.findToken(token, parseInt(network));
        
        if (!tokenInfo.topPairs || tokenInfo.topPairs.length === 0) {
            return res.json({ success: false, message: '未找到交易對' });
        }
        
        // 2. 選擇最大流動性的交易對
        const mainPair = tokenInfo.topPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        
        // 3. 查詢過去24小時的交易
        const now = Math.floor(Date.now() / 1000);
        const from = now - 86400; // 24小時前
        
        const traders = await codexClient.getTokenEvents(
            mainPair.address,
            parseInt(network),
            parseFloat(minAmount),
            from,
            now
        );
        
        res.json({
            success: true,
            data: {
                token: tokenInfo,
                traders,
                query: { token, minAmount, network, timeRange: '24h' }
            }
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
    console.log(`🔑 Codex API Key: ${process.env.CODEX_API_KEY ? 'Set' : 'Not Set'}`);
});

module.exports = app;