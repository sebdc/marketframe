const MarketPriceAdjuster = require('../src/api/MarketPriceAdjuster');
const Credentials = require('../src/utils/Credentials');
const WarframeMarket = require('../src/api/WarframeMarket');
const readline = require('readline');
const MarketAnalyzer = require('../src/api/MarketAnalyzer');

class MarketCLI {
    constructor() {
        this.wfm = new WarframeMarket();
        this.adjuster = new MarketPriceAdjuster();
        this.adjuster.setWarframeMarket(this.wfm);
    }

    createInterface() {
        return readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async promptUser(question) {
        const rl = this.createInterface();

        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                rl.close();
                resolve(answer.toLowerCase());
            });
        });
    }

    async showMenu() {
        console.log('\n=== WARFRAME MARKET PRICE ADJUSTER ===');
        console.log('1. Adjust Sell Orders');
        console.log('2. Adjust Buy Orders');
        console.log('3. Exit');

        const choice = await this.promptUser('\nEnter your choice (1-3): ');

        if (choice === '3' || choice === 'exit') {
            console.log('Exiting...');
            process.exit(0);
        }

        if (choice !== '1' && choice !== '2') {
            console.log('Invalid choice. Exiting...');
            process.exit(1);
        }

        return choice;
    }

    async processOrders(orders, orderType) {
        const adjustments = [];
        let totalOrders = 0;
        let adjustedOrders = 0;

        console.log(`\nAnalyzing ${orders.length} ${orderType} orders...\n`);

        for (const order of orders) {
            totalOrders++;

            const adjustment = await this.adjuster.processOrder(order, orderType);

            if (adjustment) {
                adjustments.push(adjustment);
                adjustedOrders++;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return { adjustments, totalOrders, adjustedOrders };
    }

    async applyAdjustments(adjustments) {
        console.log('\n=== Applying Price Updates ===');

        let successCount = 0;
        let failCount = 0;

        for (const adjustment of adjustments) {
            try {
                console.log(`\nUpdating ${adjustment.order.item.en.item_name}...`);
                await this.wfm.orders.updateOrder(adjustment.order.id, { platinum: adjustment.recommendedPrice });
                console.log(`✓ Price updated: ${adjustment.currentPrice}p → ${adjustment.recommendedPrice}p`);
                successCount++;
            } catch (error) {
                console.error(`❌ Failed to update ${adjustment.order.item.en.item_name}:`, error.message);
                failCount++;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return { successCount, failCount };
    }

    async run() {
        try {
            console.log('Logging in to Warframe Market...');
            await this.wfm.signIn(Credentials.credentials.email, Credentials.credentials.password);
            console.log('✓ Login successful\n');

            const choice = await this.showMenu();
            const orderType = choice === '1' ? 'sell' : 'buy';

            const [buyOrders, sellOrders] = await this.wfm.orders.getMyOrders();
            const orders = orderType === 'sell' ? sellOrders : buyOrders;

            if (orders.length === 0) {
                console.log(`No ${orderType} orders found.`);
                return;
            }

            console.log('\n=== DRY RUN ANALYSIS ===');
            const { adjustments, totalOrders, adjustedOrders } = await this.processOrders(orders, orderType);

            if (adjustments.length === 0) {
                console.log('\nNo price adjustments needed!');
                return;
            }

            console.log('\n=== SUMMARY ===');
            console.log(`Total orders analyzed: ${totalOrders}`);
            console.log(`Adjustments recommended: ${adjustedOrders}`);

            adjustments.forEach(adj => {
                console.log(`\n${adj.order.item.en.item_name}:`);
                console.log(`• ${adj.currentPrice}p → ${adj.recommendedPrice}p`);
                console.log(`• Confidence: ${adj.analysis.confidence}%`);
            });

            const confirm = await this.promptUser('\nDo you want to apply these changes? (yes/no): ');

            if (confirm === 'yes') {
                const { successCount, failCount } = await this.applyAdjustments(adjustments);

                console.log('\n=== FINAL RESULTS ===');
                console.log(`✓ Successfully updated: ${successCount}`);
                if (failCount > 0) {
                    console.log(`❌ Failed updates: ${failCount}`);
                }
            } else {
                console.log('Operation cancelled');
            }
        } catch (error) {
            console.error('Fatal error:', error.message);
            process.exit(1);
        }
    }
}

if (require.main === module) {
    const cli = new MarketCLI();
    cli.run().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = MarketCLI;