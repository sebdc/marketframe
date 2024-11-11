const MarketAnalyzer = require('./MarketAnalyzer');

class MarketPriceAdjuster {
    constructor() {
        this.analyzer = new MarketAnalyzer();
    }

    static get MARKUP() {
        return {
            LOW_TIER: { buy: -15, sell: -1 },
            MID_TIER: { buy: -20, sell: -2 },
            HIGH_TIER: { buy: -30, sell: -5 }
        };
    }

    static get PRICE_THRESHOLDS() {
        return { LOW_MAX: 55, MID_MAX: 150 };
    }

    static get CATEGORIES() {
        return {
            LOW_TIER: 'low_tier',
            MID_TIER: 'mid_tier',
            HIGH_TIER: 'high_tier'
        };
    }

    determineCategory(marketPrice) {
        if (marketPrice <= MarketPriceAdjuster.PRICE_THRESHOLDS.LOW_MAX) {
            return MarketPriceAdjuster.CATEGORIES.LOW_TIER;
        } else if (marketPrice <= MarketPriceAdjuster.PRICE_THRESHOLDS.MID_MAX) {
            return MarketPriceAdjuster.CATEGORIES.MID_TIER;
        } else {
            return MarketPriceAdjuster.CATEGORIES.HIGH_TIER;
        }
    }

    getMarkup(category, orderType) {
        return MarketPriceAdjuster.MARKUP[category][orderType];
    }

    setWarframeMarket(wfm) {
        this.wfm = wfm;
    }

    calculateOptimalPrice(buyOrders, sellOrders, orderType) {
        const topBuyOrders = this.getTopOrders(buyOrders, 10, 'buy');
        const topSellOrders = this.getTopOrders(sellOrders, 10, 'sell');

        if (!topSellOrders.length && !topBuyOrders.length) {
            return null;
        }

        const marketPrice = orderType === 'sell'
            ? Math.min(...topSellOrders.map(order => order.platinum))
            : Math.max(...topBuyOrders.map(order => order.platinum));

        const category = this.determineCategory(marketPrice);
        const markup = this.getMarkup(category, orderType);
        const recommendedPrice = marketPrice + markup;

        return {
            category,
            marketPrice,
            recommendedPrice,
            orders: {
                buy: topBuyOrders.map(order => order.platinum),
                sell: topSellOrders.map(order => order.platinum)
            }
        };
    }

    async processOrder(order, orderType) {
        const itemName = order.item?.en?.item_name;

        if (!itemName) {
            console.log('Skipping analysis due to missing item data');
            return null;
        }

        console.log(`\n=== Analyzing ${itemName} ===`);
        console.log(`Current price: ${order.platinum}p`);

        try {
            if (!this.wfm) {
                throw new Error('WarframeMarket instance not set');
            }

            const itemType = this.getItemType(order.item);
            const maxRank = this.getItemMaxRank(order.item);

            const [buyOrders, sellOrders] = await this.getMarketData(order.item.url_name, itemType, maxRank);

            const analysis = this.calculateOptimalPrice(buyOrders, sellOrders, orderType);

            if (!analysis) {
                console.log('Could not determine optimal price');
                return null;
            }

            const currentPrice = order.platinum;
            const newPrice = analysis.recommendedPrice;
            const priceChange = newPrice - currentPrice;
            const changePercent = (priceChange / currentPrice * 100).toFixed(1);

            if (Math.abs(priceChange / currentPrice) <= 0.05) {
                console.log('\nPrice is already optimal');
                return null;
            }

            console.log('\nRecommended Change:');
            console.log(`${currentPrice}p → ${newPrice}p (${priceChange >= 0 ? '+' : ''}${changePercent}%)`);

            return {
                order: order,
                currentPrice: currentPrice,
                recommendedPrice: newPrice,
                priceChange: priceChange,
                changePercent: changePercent,
                analysis: analysis
            };
        } catch (error) {
            console.error(`Error processing ${itemName}:`, error.message);
            return null;
        }
    }

    getTopOrders(orders, limit, type) {
        return [...orders]
            .filter(order => order.isOnline())
            .sort((a, b) => type === 'buy' ? b.platinum - a.platinum : a.platinum - b.platinum)
            .slice(0, limit);
    }

    getItemType(item) {
        if (item.tags.includes('mod')) {
            return 'mod';
        }

        if (item.tags.includes('arcane')) {
            return 'arcane';
        }

        return 'regular';
    }

    getItemMaxRank(item) {
        if (item.tags.includes('mod')) {
            return item.mod_max_rank;
        }

        if (item.tags.includes('arcane')) {
            const rank3Arcanes = [
                'arcane_resistance',
                'arcane_warmth',
                'arcane_null_strike',
                'arcane_deflection',
                'arcane_aegis'
            ];

            return rank3Arcanes.includes(item.url_name) ? 3 : 5;
        }

        return 0;
    }

    async getMarketData(itemName, itemType, maxRank) {
        console.log(`\nFetching market data for ${itemName} (${itemType}, max rank: ${maxRank})`);

        const [buyOrders, sellOrders] = await this.wfm.orders.getRecentOrders(itemName, { type: itemType, maxRank: maxRank });

        console.log(`Orders received - Buy: ${buyOrders.length}, Sell: ${sellOrders.length}`);

        return [buyOrders, sellOrders];
    }
}

module.exports = MarketPriceAdjuster;