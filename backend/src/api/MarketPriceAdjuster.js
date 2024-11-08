const WarframeMarket = require('./WarframeMarket');
const Credentials = require('../utils/Credentials');

class MarketPriceAdjuster {
    constructor() {
        this.wfm = new WarframeMarket();
    }

    calculateMedian(orders) {
        if (orders.length === 0) return 0;
        
        const prices = orders.map(order => order.platinum).sort((a, b) => a - b);
        const mid = Math.floor(prices.length / 2);
        
        return prices.length % 2 === 0
            ? (prices[mid - 1] + prices[mid]) / 2
            : prices[mid];
    }

    calculateMode(numbers) {
        const frequency = {};
        let maxFreq = 0;
        let mode = null;

        numbers.forEach(num => {
            frequency[num] = (frequency[num] || 0) + 1;
            if (frequency[num] > maxFreq) {
                maxFreq = frequency[num];
                mode = num;
            }
        });

        return mode;
    }

    calculateOptimalPrice(orders, maxOrders = 10, priceDisparity = 0.10) {
        if (orders.length === 0) return null;

        // Get the N cheapest orders
        const cheapestOrders = orders
            .slice(0, maxOrders)
            .sort((a, b) => a.platinum - b.platinum);

        // Calculate mode of these prices
        const mode = this.calculateMode(cheapestOrders.map(order => order.platinum));

        console.log('\nPrice Analysis:');
        console.log(`Mode price: ${mode}p`);
        
        // Analyze each price starting from the cheapest
        for (let i = 0; i < cheapestOrders.length; i++) {
            const currentPrice = cheapestOrders[i].platinum;
            const priceDiff = Math.abs(currentPrice - mode) / mode;

            console.log(`\nAnalyzing price: ${currentPrice}p`);
            console.log(`- Difference from mode: ${(priceDiff * 100).toFixed(1)}%`);
            console.log(`- Seller: ${cheapestOrders[i].user.ingame_name}`);

            // If price disparity is within acceptable range
            if (priceDiff <= priceDisparity) {
                return {
                    price: currentPrice,
                    mode: mode,
                    disparity: priceDiff,
                    ordersAnalyzed: i + 1,
                    seller: cheapestOrders[i].user.ingame_name
                };
            }
        }

        // If no price meets our criteria, use the mode
        return {
            price: mode,
            mode: mode,
            disparity: 0,
            ordersAnalyzed: cheapestOrders.length,
            seller: null
        };
    }


    getItemTypeAndMaxRank(item) {
        console.log('\nItem data:', {
            name: item.en.item_name,
            mod_max_rank: item.mod_max_rank,
            tags: item.tags,
            url_name: item.url_name
        });

        // Check if item is a mod or arcane based on tags
        if (item.tags.includes('mod')) {
            return {
                type: 'mod',
                maxRank: item.mod_max_rank
            };
        }

        if (item.tags.includes('arcane_enhancement')) {
            const rank3Arcanes = [
                'arcane_resistance',
                'arcane_warmth',
                'arcane_null_resistance',
                'arcane_deflection',
                'arcane_aegis'
            ];

            const urlName = item.url_name.toLowerCase();
            const maxRank = rank3Arcanes.includes(urlName) ? 3 : 5;

            return {
                type: 'arcane',
                maxRank
            };
        }

        return {
            type: 'regular',
            maxRank: 0
        };
    }

    async getMarketData(itemName, itemType, maxRank) {
        console.log(`\nFetching market data for ${itemName} (${itemType}, max rank: ${maxRank})`);
        
        const options = {
            type: itemType,
            maxRank: maxRank
        };
        
        const [buyOrders, sellOrders] = await this.wfm.orders.getRecentOrders(itemName, options);
        
        console.log(`Orders received - Buy: ${buyOrders.length}, Sell: ${sellOrders.length}`);
        
        // Filter out our own orders
        const filteredOrders = sellOrders.filter(order => 
            order.user.ingame_name !== this.wfm.auth.getUsername()
        );

        if (filteredOrders.length === 0) {
            return {
                optimal: null,
                numOrders: 0
            };
        }

        // Calculate optimal price using our new strategy
        const optimal = this.calculateOptimalPrice(filteredOrders);

        return {
            optimal,
            numOrders: filteredOrders.length
        };
    }


    calculateNewPrice(order, marketData) {
        if (marketData.numOrders === 0) {
            console.log(`No other sellers found for ${order.item.en.item_name} at the required rank`);
            return null;
        }

        if (!marketData.optimal) {
            console.log('Could not determine optimal price');
            return null;
        }

        const currentPrice = order.platinum;
        const optimalPrice = marketData.optimal.price;
        
        // Don't adjust if we're within 5% of the optimal price
        const priceDifference = Math.abs(currentPrice - optimalPrice) / optimalPrice;
        if (priceDifference <= 0.05) {
            return null;
        }

        return Math.round(optimalPrice);
    }

    async adjustPrices(options = { dryRun: false }) {
        try {
            await this.wfm.signIn(Credentials.credentials.email, Credentials.credentials.password);
            console.log('Successfully logged in');

            const [_, mySellOrders] = await this.wfm.orders.getMyOrders();
            console.log(`Found ${mySellOrders.length} sell orders\n`);

            for (const order of mySellOrders) {
                const itemName = order.item.en.item_name;
                console.log(`\n=== Analyzing order: ${itemName} ===`);
                console.log(`Current price: ${order.platinum} platinum`);

                try {
                    const { type: itemType, maxRank } = this.getItemTypeAndMaxRank(order.item);
                    
                    if (itemType !== 'regular') {
                        const currentRank = order.mod_rank ?? 0;
                        console.log(`Item type: ${itemType.toUpperCase()}, Current rank: ${currentRank}, Max rank: ${maxRank}`);
                        
                        if (currentRank !== maxRank) {
                            console.log(`⚠️ Warning: Our ${itemType} is not max rank (${currentRank}/${maxRank})`);
                            console.log('Skipping price adjustment for non-max rank item');
                            continue;
                        }
                    }

                    const marketData = await this.getMarketData(order.item.url_name, itemType, maxRank);
                    
                    if (marketData.optimal) {
                        console.log('\nMarket Analysis:');
                        console.log(`- Orders analyzed: ${marketData.optimal.ordersAnalyzed}`);
                        console.log(`- Mode price: ${marketData.optimal.mode}p`);
                        console.log(`- Optimal price: ${marketData.optimal.price}p`);
                        console.log(`- Price disparity: ${(marketData.optimal.disparity * 100).toFixed(1)}%`);
                        if (marketData.optimal.seller) {
                            console.log(`- Based on seller: ${marketData.optimal.seller}`);
                        }
                    }

                    const newPrice = this.calculateNewPrice(order, marketData);

                    if (newPrice === null) {
                        console.log('Price is already optimal');
                        continue;
                    }

                    const priceChange = newPrice - order.platinum;
                    const changePercent = ((newPrice - order.platinum) / order.platinum * 100).toFixed(1);
                    console.log(`Suggested price change: ${priceChange > 0 ? '+' : ''}${priceChange}p (${changePercent}%) to ${newPrice}p`);

                    if (!options.dryRun) {
                        await this.wfm.orders.updateOrder(order.id, { platinum: newPrice });
                        console.log('✓ Price updated successfully');
                    } else {
                        console.log('(Dry run - price not updated)');
                    }

                } catch (error) {
                    console.error(`Error processing ${itemName}:`, error.message);
                    continue;
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } catch (error) {
            console.error('Fatal error:', error.message);
            process.exit(1);
        }
    }
}

// Main function remains the same
async function main() {
    const adjuster = new MarketPriceAdjuster();
    
    console.log('=== DRY RUN ===');
    await adjuster.adjustPrices({ dryRun: true });
    
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('\nDo you want to apply these changes? (yes/no): ', async (answer) => {
        readline.close();
        
        if (answer.toLowerCase() === 'yes') {
            console.log('\n=== APPLYING CHANGES ===');
            await adjuster.adjustPrices({ dryRun: false });
        } else {
            console.log('Operation cancelled');
        }
        
        process.exit(0);
    });
}

if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = MarketPriceAdjuster;
