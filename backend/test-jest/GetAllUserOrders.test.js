// - Dependencies
const WarframeMarket = require('../src/api/WarframeMarket');
const ItemOrder = require('../src/model/ItemOrder');

const testCases = [
    { 
        username: 'Zorien',
        description: 'Existing user with orders',
        shouldSucceed: true
    },
    { 
        username: 'Xcist3',
        description: 'Existing user with orders',
        shouldSucceed: true
    },
    {
        username: 'maxz55',
        description: 'Existing user without orders',
        shouldSucceed: true
    },
    { 
        username: 'ThisUserDoesNotExist12345', 
        description: 'Non-existent user',
        shouldSucceed: false
    },
    { 
        username: '', 
        description: 'Empty username',
        shouldSucceed: false
    }
];

describe('WarframeMarket Get All User Orders Tests', () => {
    const api = new WarframeMarket();

    test.each(testCases) (
        'Should handle getting all orders of a profile for $description',
        async ({ username, description, shouldSucceed }) => {
            try {
                const [buyOrders, sellOrders] = await api.getProfileOrders(username);

                if( shouldSucceed ) {
                    // - Verify the structure of the response
                    expect(Array.isArray(buyOrders)).toBe(true);
                    expect(Array.isArray(sellOrders)).toBe(true);

                    console.log(`Test completed successfully for case: ${description}`);
                    console.log(`Found ${buyOrders.length} buy orders and ${sellOrders.length} sell orders`);

                    // - Combine and format the first 3 orders (buy and sell) for display
                    const threeOrders = [...buyOrders, ...sellOrders].slice(0, 3);
                    threeOrders.forEach((orderData) => {
                        const order = new ItemOrder(orderData); // Create ItemOrder object
                        const orderType = order.order_type === 'buy' ? 'Buying' : 'Selling';
                        const itemName = order.item.en.item_name; // Assuming "en" contains the English name
                        const itemId = order.item.id;
                        const platinum = order.platinum;
                        const lastUpdate = order.last_update;
                        const year = lastUpdate.getFullYear();
                        const month = (lastUpdate.getMonth() + 1).toString().padStart(2, '0');
                        const day = lastUpdate.getDate().toString().padStart(2, '0');

                        console.log(`${orderType} ${itemName} [${itemId}] for ${platinum} platinum (${year}/${month}/${day})`);
                    });
                } else {
                    throw new Error('Expected request to fail but it succeeded');
                }
            } catch( error ) {
                console.error(`Error during test for ${description}:`, error.message);
                
                if( shouldSucceed ) {
                    throw new Error('Expected request to succeed but it failed');
                } else {
                    // - Test passed because we expected it to fail
                    expect(error).toBeTruthy();
                }
            }
        }
    );
});