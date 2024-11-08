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

    /**
     * Calculate the optimal price based on market data
     * @param {Array} orders Array of orders
     * @param {string} orderType Type of order ('buy' or 'sell')
     * @param {Object} options Price calculation options
     * @returns {Object} Optimal price and analysis data
     */
    calculateOptimalPrice(orders, orderType, options = { maxOrders: 10, priceDisparity: 0.10 }) {
        if (orders.length === 0) return null;

        // Sort and slice orders based on type
        const sortedOrders = orders
            .sort((a, b) => orderType === 'sell' ? 
                a.platinum - b.platinum : // Ascending for sell (cheapest first)
                b.platinum - a.platinum   // Descending for buy (most expensive first)
            )
            .slice(0, options.maxOrders);

        const mode = this.calculateMode(sortedOrders.map(order => order.platinum));

        console.log('\nPrice Analysis:');
        console.log(`Mode price: ${mode}p`);
        
        // Find optimal price
        for (let i = 0; i < sortedOrders.length; i++) {
            const currentPrice = sortedOrders[i].platinum;
            const priceDiff = Math.abs(currentPrice - mode) / mode;

            console.log(`\nAnalyzing price: ${currentPrice}p`);
            console.log(`- Difference from mode: ${(priceDiff * 100).toFixed(1)}%`);
            console.log(`- ${orderType === 'sell' ? 'Seller' : 'Buyer'}: ${sortedOrders[i].user.ingame_name}`);

            if (priceDiff <= options.priceDisparity) {
                return {
                    price: currentPrice,
                    mode: mode,
                    disparity: priceDiff,
                    ordersAnalyzed: i + 1,
                    username: sortedOrders[i].user.ingame_name
                };
            }
        }

        return {
            price: mode,
            mode: mode,
            disparity: 0,
            ordersAnalyzed: sortedOrders.length,
            username: null
        };
    }


    getItemTypeAndMaxRank(item) {
        /*
        console.log('\nItem data:', {
            name: item.en.item_name,
            mod_max_rank: item.mod_max_rank,
            tags: item.tags,
            url_name: item.url_name
        });
        */

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

    async getMarketData(itemName, itemType, maxRank, orderType) {
        console.log(`\nFetching market data for ${itemName} (${itemType}, max rank: ${maxRank})`);
        
        const options = {
            type: itemType,
            maxRank: maxRank
        };
        
        const [buyOrders, sellOrders] = await this.wfm.orders.getRecentOrders(itemName, options);
        
        console.log(`Orders received - Buy: ${buyOrders.length}, Sell: ${sellOrders.length}`);
        
        // Get relevant orders based on type
        const orders = (orderType === 'buy' ? buyOrders : sellOrders)
            .filter(order => order.user.ingame_name !== this.wfm.auth.getUsername());

        if (orders.length === 0) {
            return {
                optimal: null,
                numOrders: 0
            };
        }

        const optimal = this.calculateOptimalPrice(orders, orderType);

        return {
            optimal,
            numOrders: orders.length
        };
    }

    async processOrder(order, options = { dryRun: false }) {
        const itemName = order.item.en.item_name;
        const orderType = order.order_type;
        console.log(`\n=== Analyzing ${orderType.toUpperCase()} order: ${itemName} ===`);
        console.log(`Current price: ${order.platinum} platinum`);

        try {
            const { type: itemType, maxRank } = this.getItemTypeAndMaxRank(order.item);
            
            if (itemType !== 'regular') {
                const currentRank = order.mod_rank ?? 0;
                console.log(`Item type: ${itemType.toUpperCase()}, Current rank: ${currentRank}, Max rank: ${maxRank}`);
                
                if (currentRank !== maxRank) {
                    console.log(`⚠️ Warning: Our ${itemType} is not max rank (${currentRank}/${maxRank})`);
                    console.log('Skipping price adjustment for non-max rank item');
                    return;
                }
            }

            const marketData = await this.getMarketData(order.item.url_name, itemType, maxRank, orderType);
            
            if (marketData.optimal) {
                console.log('\nMarket Analysis:');
                console.log(`- Orders analyzed: ${marketData.optimal.ordersAnalyzed}`);
                console.log(`- Mode price: ${marketData.optimal.mode}p`);
                console.log(`- Optimal price: ${marketData.optimal.price}p`);
                console.log(`- Price disparity: ${(marketData.optimal.disparity * 100).toFixed(1)}%`);
                if (marketData.optimal.username) {
                    console.log(`- Based on ${orderType === 'buy' ? 'buyer' : 'seller'}: ${marketData.optimal.username}`);
                }

                const currentPrice = order.platinum;
                const newPrice = Math.round(marketData.optimal.price);

                // Don't adjust if we're within 5% of the optimal price
                const priceDifference = Math.abs(currentPrice - newPrice) / newPrice;
                if (priceDifference <= 0.05) {
                    console.log('Price is already optimal');
                    return;
                }

                const priceChange = newPrice - currentPrice;
                const changePercent = (priceChange / currentPrice * 100).toFixed(1);
                console.log(`Suggested price change: ${priceChange > 0 ? '+' : ''}${priceChange}p (${changePercent}%) to ${newPrice}p`);

                if (!options.dryRun) {
                    await this.wfm.orders.updateOrder(order.id, { platinum: newPrice });
                    console.log('✓ Price updated successfully');
                } else {
                    console.log('(Dry run - price not updated)');
                }
            } else {
                console.log('Could not determine optimal price');
            }
        } catch (error) {
            console.error(`Error processing ${itemName}:`, error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }


    async adjustSellOrders(options = { dryRun: false }) {
        try {
            await this.wfm.signIn(Credentials.credentials.email, Credentials.credentials.password);
            console.log('Successfully logged in');

            const [_, sellOrders] = await this.wfm.orders.getMyOrders();
            console.log(`Found ${sellOrders.length} sell orders\n`);

            for (const order of sellOrders) {
                await this.processOrder(order, options);
            }
        } catch (error) {
            console.error('Fatal error:', error.message);
            throw error;
        }
    }

    async adjustBuyOrders(options = { dryRun: false }) {
        try {
            await this.wfm.signIn(Credentials.credentials.email, Credentials.credentials.password);
            console.log('Successfully logged in');

            const [buyOrders, _] = await this.wfm.orders.getMyOrders();
            console.log(`Found ${buyOrders.length} buy orders\n`);

            for (const order of buyOrders) {
                await this.processOrder(order, options);
            }
        } catch (error) {
            console.error('Fatal error:', error.message);
            throw error;
        }
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

// ... rest of the MarketPriceAdjuster class remains the same ...

async function promptUser(question) {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        readline.question(question, (answer) => {
            readline.close();
            resolve(answer.toLowerCase());
        });
    });
}

async function main() {
    const adjuster = new MarketPriceAdjuster();
    
    console.log('\n=== WARFRAME MARKET PRICE ADJUSTER ===');
    console.log('1. Adjust Sell Orders');
    console.log('2. Adjust Buy Orders');
    console.log('3. Exit');

    const choice = await promptUser('\nEnter your choice (1-3): ');

    if (choice === '3' || choice === 'exit') {
        console.log('Exiting...');
        process.exit(0);
    }

    if (choice !== '1' && choice !== '2') {
        console.log('Invalid choice. Exiting...');
        process.exit(1);
    }

    // Run analysis in dry run mode first
    console.log('\n=== DRY RUN ANALYSIS ===');
    if (choice === '1') {
        await adjuster.adjustSellOrders({ dryRun: true });
    } else {
        await adjuster.adjustBuyOrders({ dryRun: true });
    }

    // Ask for confirmation
    const confirm = await promptUser('\nDo you want to apply these changes? (yes/no): ');

    if (confirm === 'yes') {
        console.log('\n=== APPLYING CHANGES ===');
        if (choice === '1') {
            await adjuster.adjustSellOrders({ dryRun: false });
        } else {
            await adjuster.adjustBuyOrders({ dryRun: false });
        }
        console.log('\nChanges applied successfully!');
    } else {
        console.log('Operation cancelled');
    }

    process.exit(0);
}

if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = MarketPriceAdjuster;