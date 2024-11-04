// - Dependencies
const WarframeMarket = require('../src/api/WarframeMarket');
const ItemOrder = require('../src/model/ItemOrder');

const testCases = [
    { 
        username: 'Zorien',
        description: 'Should retrieve and display the first order for user with orders',
        shouldSucceed: true,
        expectOrders: true
    },
    { 
        username: 'Xcist3',
        description: 'Should retrieve and display the first order for user with orders',
        shouldSucceed: true,
        expectOrders: true
    },
    {
        username: 'maxz55',
        description: 'Should indicate no orders found for existing user without orders',
        shouldSucceed: true,
        expectOrders: false
    },
    { 
        username: 'ThisUserDoesNotExist12345', 
        description: 'Should fail to retrieve orders for non-existent user',
        shouldSucceed: false,
        expectOrders: false
    },
    { 
        username: '', 
        description: 'Should fail to retrieve orders for empty username',
        shouldSucceed: false,
        expectOrders: false
    }
];

describe('WarframeMarket Get First User Order Test', () => {
    const api = new WarframeMarket();

    test.each(testCases) (
        '$description',
        async({ username, shouldSucceed, expectOrders }) => {
            try {
                const [buyOrders, sellOrders] = await api.getProfileOrders(username);
                const hasOrders = buyOrders.length > 0 || sellOrders.length > 0;

                if( shouldSucceed ) {
                    // - Verify that we received arrays
                    expect(Array.isArray(buyOrders)).toBe(true);
                    expect(Array.isArray(sellOrders)).toBe(true);
                
                    if( expectOrders ) {
                        const firstOrder = buyOrders.length > 0 ? buyOrders[0] : sellOrders[0];
                        expect(firstOrder).toBeTruthy();
                        console.log(`First order for user ${username}:`, firstOrder);
                    } else {
                        expect(hasOrders).toBe(false);
                        console.log(`No orders found for user: ${username}`);
                    }
                } else {
                    throw new Error(`Expected request to fail for ${username} but it succeeded`);
                }
            } catch( error ) {
                if( shouldSucceed ) {
                    throw new Error('Expected request to succeed but it failed');
                } else {
                    // - Expected failure, pass the test with the caught error
                    expect(error).toBeTruthy();
                    console.log(`Failed to retrieve orders for ${username} as expected:`, error.message);
                }
            }
        }
    );
});
