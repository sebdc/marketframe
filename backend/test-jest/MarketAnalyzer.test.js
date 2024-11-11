const MarketAnalyzer = require('../src/api/MarketAnalyzer');
const ItemOrder = require('../src/model/ItemOrder');

describe('MarketAnalyzer Tests', () => {
    function createMockOrders(prices, type = 'sell', status = 'ingame') {
        return prices.map(price => new ItemOrder({
            id: `order_${Math.random()}`,
            platinum: price,
            quantity: 1,
            order_type: type,
            platform: 'pc',
            region: 'en',
            creation_date: new Date().toISOString(),
            last_update: new Date().toISOString(),
            visible: true,
            user: {
                ingame_name: `user_${Math.random()}`,
                status: status,
                reputation: 0
            }
        }));
    }

    const testCases = [
        {
            description: 'Low-tier item (<55p)',
            orders: {
                sell: [30, 35, 40],
                buy: [25, 28, 29]
            },
            expectedCategory: MarketAnalyzer.PRICE_CATEGORIES.LOW_TIER,
            shouldSucceed: true
        },
        {
            description: 'Mid-tier item (55-150p)',
            orders: {
                sell: [100, 105, 110],
                buy: [90, 95, 98]
            },
            expectedCategory: MarketAnalyzer.PRICE_CATEGORIES.MID_TIER,
            shouldSucceed: true
        },
        {
            description: 'High-tier item (>150p)',
            orders: {
                sell: [200, 210, 220],
                buy: [180, 185, 190]
            },
            expectedCategory: MarketAnalyzer.PRICE_CATEGORIES.HIGH_TIER,
            shouldSucceed: true
        },
        {
            description: 'Edge case - exactly 55p',
            orders: {
                sell: [55, 60, 65],
                buy: [50, 52, 53]
            },
            expectedCategory: MarketAnalyzer.PRICE_CATEGORIES.MID_TIER,
            shouldSucceed: true
        },
        {
            description: 'Edge case - exactly 150p',
            orders: {
                sell: [150, 155, 160],
                buy: [140, 145, 148]
            },
            expectedCategory: MarketAnalyzer.PRICE_CATEGORIES.HIGH_TIER,
            shouldSucceed: true
        },
        {
            description: 'No online sellers',
            orders: {
                sell: [],
                buy: [100, 105, 110]
            },
            expectedCategory: null,
            shouldSucceed: false
        }
    ];

    test.each(testCases)(
        'Should analyze $description',
        async ({ description, orders, expectedCategory, shouldSucceed }) => {
            try {
                const buyOrders = createMockOrders(orders.buy, 'buy');
                const sellOrders = createMockOrders(orders.sell, 'sell');

                const analysis = MarketAnalyzer.analyzeMarket(buyOrders, sellOrders);
                
                if( shouldSucceed ) {
                    expect(analysis).toBeTruthy();
                    
                    console.log('\nMarket Analysis Results:', {
                        description,
                        category: analysis.category,
                        lowestPrice: analysis.marketActivity.lowestPrice,
                        onlineSellers: analysis.marketActivity.onlineSellers,
                        median: analysis.stats.median,
                        mean: analysis.stats.mean
                    });

                    expect(analysis.category).toBe(expectedCategory);
                } else {
                    expect(analysis).toBeNull();
                    console.log(`Analysis returned null as expected for ${description}`);
                }
            } catch( error ) {
                console.error(`Error during test for ${description}:`, error.message);
                
                if( shouldSucceed ) {
                    throw error;
                } else {
                    expect(error).toBeTruthy();
                }
            }
        }
    );
});