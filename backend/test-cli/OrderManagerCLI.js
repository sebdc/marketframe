const readline = require('readline');
const WarframeMarket = require('../src/api/WarframeMarket');
const Credentials = require('../src/utils/Credentials');
const { email, password } = Credentials.credentials;

class OrderManagerCLI {
    constructor() {
        this.wfm = new WarframeMarket();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.buyOrders = [];
        this.sellOrders = [];
    }

    async initialize( email, password ) {
        try {
            console.log('Logging in...');
            await this.wfm.signIn(email, password);
            console.log('Successfully logged in!');
            await this.fetchOrders();
        } catch( error ) {
            console.error('Failed to initialize:', error.message);
            process.exit(1);
        }
    }

    async fetchOrders() {
        try {
            [this.buyOrders, this.sellOrders] = await this.wfm.orders.getMyOrders();
            console.log(`Found ${this.buyOrders.length} buy orders and ${this.sellOrders.length} sell orders.`);
        } catch( error ) {
            console.error('Failed to fetch orders:', error.message);
            throw error;
        }
    }

    displayOrders() {
        console.log('\n=== BUY ORDERS ===');
        this.buyOrders.forEach((order, index) => {
            const visibility = order.visible ? '' : '[INVISIBLE] ';
            console.log(`${index + 1}. ${visibility}Buying ${order.item.en.item_name} for ${order.platinum}p (Quantity: ${order.quantity})`);
        });

        const buyOrderCount = this.buyOrders.length;
        console.log('\n=== SELL ORDERS ===');
        this.sellOrders.forEach((order, index) => {
            const visibility = order.visible ? '' : '[INVISIBLE] ';
            console.log(`${index + buyOrderCount + 1}. ${visibility}Selling ${order.item.en.item_name} for ${order.platinum}p (Quantity: ${order.quantity})`);
        });
    }

    getOrderById( selection ) {
        const buyOrderCount = this.buyOrders.length;
        if( selection <= 0 || selection > (buyOrderCount + this.sellOrders.length) ) {
            throw new Error('Invalid selection');
        }

        if( selection <= buyOrderCount ) {
            return {
                order: this.buyOrders[selection - 1],
                type: 'buy'
            };
        } else {
            return {
                order: this.sellOrders[selection - buyOrderCount - 1],
                type: 'sell'
            };
        }
    }

    async promptForSelection() {
        return new Promise((resolve) => {
            this.rl.question('\nEnter the number of the order to modify (or 0 to exit): ', (answer) => {
                resolve(parseInt(answer, 10));
            });
        });
    }

    async promptForUpdateType() {
        return new Promise((resolve) => {
            console.log('\nWhat would you like to modify?');
            console.log('1. Price');
            console.log('2. Quantity');
            console.log('3. Rank (for mods)');
            console.log('4. Visibility');
            console.log('5. Cancel');
            
            this.rl.question('Enter your choice (1-5): ', (answer) => {
                resolve(parseInt(answer, 10));
            });
        });
    }

    async promptForVisibility() {
        return new Promise((resolve) => {
            this.rl.question('Make order visible? (y/n): ', (answer) => {
                resolve(answer.toLowerCase() === 'y');
            });
        });
    }

    async promptForNewValue( updateType ) {
        const promptMessages = {
            1: 'Enter new price: ',
            2: 'Enter new quantity: ',
            3: 'Enter new rank: '
        };

        return new Promise((resolve) => {
            this.rl.question(promptMessages[updateType], (answer) => {
                resolve(parseInt(answer, 10));
            });
        });
    }

    async confirmUpdate( order, updateType, newValue ) {
        const updateTypes = {
            1: 'price',
            2: 'quantity',
            3: 'rank'
        };

        return new Promise((resolve) => {
            console.log('\nConfirm Update:');
            console.log(`Item: ${order.item.en.item_name}`);
            console.log(`Current ${updateTypes[updateType]}: ${order[updateTypes[updateType] === 'price' ? 'platinum' : updateTypes[updateType]]}`);
            console.log(`New ${updateTypes[updateType]}: ${newValue}`);
            
            this.rl.question('Proceed with update? (y/n): ', (answer) => {
                resolve(answer.toLowerCase() === 'y');
            });
        });
    }

    async updateOrder( order, updateType, newValue ) {
        const updateData = {};
        switch( updateType ) {
            case 1:
                updateData.platinum = newValue;
                break;
            case 2:
                updateData.quantity = newValue;
                break;
            case 3:
                updateData.rank = newValue;
                break;
            case 4:
                updateData.visible = newValue;
                break;
        }

        try {
            await this.wfm.orders.updateOrder(order.id, updateData);
            console.log('Order updated successfully!');
            await this.fetchOrders(); // Refresh orders
        } catch( error ) {
            console.error('Failed to update order:', error.message);
        }
    }

    async start() {
        while( true ) {
            this.displayOrders();
            const selection = await this.promptForSelection();
            
            if (selection === 0) {
                console.log('Exiting...');
                break;
            }

            try {
                const { order, type } = this.getOrderById(selection);
                const visibility = order.visible ? 'visible' : 'invisible';
                console.log(`\nSelected ${type} order for ${order.item.item_name} (${visibility})`);
                
                const updateType = await this.promptForUpdateType();
                if( updateType === 5 ) {
                    continue;
                }

                let newValue;
                if( updateType === 4 ) {
                    newValue = await this.promptForVisibility();
                } else {
                    newValue = await this.promptForNewValue(updateType);
                }

                const confirmed = await this.confirmUpdate(order, updateType, newValue);

                if( confirmed ) {
                    await this.updateOrder(order, updateType, newValue);
                } else {
                    console.log('Update cancelled');
                }
            } catch (error) {
                console.error('Error:', error.message);
            }
        }

        this.rl.close();
    }
}

async function main() {
    const manager = new OrderManagerCLI();
    await manager.initialize(email, password);
    await manager.start();
}

main().catch( error => {
    console.error('Fatal error:', error);
    process.exit(1);
});