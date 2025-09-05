const axios = require('axios');

class CodexClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://graph.defined.fi/graphql';
    }

    async gql(query, variables = {}) {
        try {
            const response = await axios.post(this.baseURL, {
                query,
                variables
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey
                },
                timeout: 30000
            });

            if (response.data.errors) {
                throw new Error(JSON.stringify(response.data.errors));
            }

            return response.data.data;
        } catch (error) {
            throw new Error(`Codex API 錯誤: ${error.message}`);
        }
    }

    async findToken(phrase, networkId = 1) {
        const query = `
            query($phrase: String!, $networkId: Int!) {
                filterTokens(
                    phrase: $phrase
                    filters: {
                        networkIds: [$networkId]
                        minVolume24: 10000
                        minLiquidityUsd: 5000
                    }
                    rankings: [trendingScore24, volume24]
                    limit: 1
                ) {
                    nodes {
                        id
                        address
                        networkId
                        name
                        symbol
                        pairs {
                            address
                            liquidity
                            volume24
                        }
                    }
                }
            }
        `;

        const data = await this.gql(query, { phrase, networkId });
        
        if (!data.filterTokens.nodes.length) {
            throw new Error('未找到代幣');
        }

        return data.filterTokens.nodes[0];
    }

    async getTokenEvents(pairAddress, networkId, minUsd, from, to) {
        const query = `
            query($pairAddress: String!, $networkId: Int!, $from: Int!, $to: Int!, $minUsd: Float, $limit: Int, $cursor: String) {
                getTokenEvents(
                    limit: $limit
                    cursor: $cursor
                    query: {
                        pairAddress: $pairAddress
                        networkId: $networkId
                        from: $from
                        to: $to
                        minUsd: $minUsd
                        eventTypes: [SWAP]
                    }
                ) {
                    nodes {
                        id
                        txHash
                        timestamp
                        side
                        maker
                        amountUsd
                        priceUsd
                    }
                    pageInfo {
                        endCursor
                        hasNextPage
                    }
                }
            }
        `;

        const pageSize = 100;
        let cursor = undefined;
        const allEvents = [];
        
        // 獲取前3頁數據
        for (let page = 0; page < 3; page++) {
            const data = await this.gql(query, {
                pairAddress,
                networkId,
                from,
                to,
                minUsd,
                limit: pageSize,
                cursor
            });

            allEvents.push(...data.getTokenEvents.nodes);
            
            if (!data.getTokenEvents.pageInfo.hasNextPage) break;
            cursor = data.getTokenEvents.pageInfo.endCursor;
        }

        return this.aggregateTraders(allEvents, minUsd);
    }

    aggregateTraders(events, minUsd) {
        const traders = new Map();

        events.forEach(event => {
            if (event.amountUsd < minUsd) return;

            const wallet = event.maker;
            if (!traders.has(wallet)) {
                traders.set(wallet, {
                    wallet,
                    totalUsd: 0,
                    orders: 0,
                    avgPrice: 0,
                    firstTx: event.timestamp,
                    lastTx: event.timestamp,
                    txHashes: []
                });
            }

            const trader = traders.get(wallet);
            trader.totalUsd += event.amountUsd;
            trader.orders += 1;
            trader.avgPrice = trader.totalUsd / trader.orders;
            trader.firstTx = Math.min(trader.firstTx, event.timestamp);
            trader.lastTx = Math.max(trader.lastTx, event.timestamp);
            trader.txHashes.push(event.txHash);
        });

        return Array.from(traders.values())
            .sort((a, b) => b.totalUsd - a.totalUsd)
            .slice(0, 10);
    }
}

module.exports = CodexClient;