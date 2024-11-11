class MarketAnalyzer {
    static PRICE_CATEGORIES = {
        LOW_TIER: 'low_tier',     // <55p
        MID_TIER: 'mid_tier',     // 55-150p
        HIGH_TIER: 'high_tier'    // >150p
    };

    static PRICE_THRESHOLDS = {
        LOW_MAX: 55,
        MID_MAX: 150
    };

    static analyzeMarket( buyOrders, sellOrders ) {
        if( !buyOrders.length && !sellOrders.length ) {
            return null;
        }

        // - Filter for online sellers only
        const activeSellOrders = sellOrders.filter(order => order.isOnline());
        
        if( activeSellOrders.length === 0 ) {
            return null;
        }

        // - Sort sell orders by price (lowest first)
        const sortedSellOrders = activeSellOrders.sort((a, b) => a.platinum - b.platinum);
        
        // - Get lowest sell price
        const lowestSellPrice = sortedSellOrders[0].platinum;
        
        // - Calculate statistics
        const stats = this.calculateMarketStats(sortedSellOrders);
        const distribution = this.analyzeOrderDistribution(sortedSellOrders);
        
        // - Determine category based on lowest sell price
        const category = this.determineCategory(lowestSellPrice);

        return {
            category,
            stats,
            distribution,
            marketActivity: {
                onlineSellers: activeSellOrders.length,
                lowestPrice: lowestSellPrice
            }
        };
    }

    static determineCategory( lowestSellPrice ) {
        if( lowestSellPrice < this.PRICE_THRESHOLDS.LOW_MAX ) {
            return this.PRICE_CATEGORIES.LOW_TIER;
        } else if( lowestSellPrice < this.PRICE_THRESHOLDS.MID_MAX ) {
            return this.PRICE_CATEGORIES.MID_TIER;
        } else {
            return this.PRICE_CATEGORIES.HIGH_TIER;
        }
    }

    static calculateMarketStats( sellOrders ) {
        const prices = sellOrders.map(order => order.platinum);
        const sortedPrices = [...prices].sort((a, b) => a - b);

        return {
            median: this.calculateMedian(sortedPrices),
            mean: sortedPrices.reduce((a, b) => a + b, 0) / sortedPrices.length,
            min: sortedPrices[0],
            max: sortedPrices[sortedPrices.length - 1]
        };
    }

    static analyzeOrderDistribution( sellOrders ) {
        const prices = sellOrders.map(order => order.platinum);
        const sortedPrices = [...prices].sort((a, b) => a - b);

        // - Calculate gaps between consecutive prices
        const gaps = [];
        for( let i = 1; i < sortedPrices.length; i++ ) {
            gaps.push(sortedPrices[i] - sortedPrices[i - 1]);
        }

        return {
            averageGap: gaps.length > 0 ? 
                gaps.reduce((a, b) => a + b, 0) / gaps.length : 0,
            priceRange: sortedPrices[sortedPrices.length - 1] - sortedPrices[0]
        };
    }

    static calculateMedian( sortedArr ) {
        const mid = Math.floor(sortedArr.length / 2);
        return sortedArr.length % 2 === 0
            ? (sortedArr[mid - 1] + sortedArr[mid]) / 2
            : sortedArr[mid];
    }
}

module.exports = MarketAnalyzer;