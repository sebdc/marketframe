const Credentials = require('../src/utils/Credentials');
const WarframeMarket = require('../src/api/WarframeMarket');

// Destructure credentials
const { email, password } = Credentials.credentials;

describe('Orders API Tests', () => {
    let wfm;

    beforeEach(() => {
        wfm = new WarframeMarket();
    });


    describe('Authenticated Order Operations', () => {
        beforeEach( async () => {
            // - Login before each authenticated test
            await wfm.signIn(email, password);
        });

        test('should get all personal orders when authenticated', async () => {
            const [buyOrders, sellOrders] = await wfm.orders.getMyOrders();

            // - Verify arrays are returned
            expect(Array.isArray(buyOrders)).toBe(true);
            expect(Array.isArray(sellOrders)).toBe(true);

            // - Log order counts for debugging
            console.log(`Found ${buyOrders.length} buy orders and ${sellOrders.length} sell orders`);

            // - Test structure of orders
            const allOrders = [...buyOrders, ...sellOrders];
            allOrders.forEach( order => {
                expect(order).toHaveProperty('id');
                expect(order).toHaveProperty('platinum');
                expect(order).toHaveProperty('quantity');
                expect(order).toHaveProperty('visible');
                expect(order).toHaveProperty('item');
                
                // Log each order for debugging
                console.log({
                    type: order.order_type,
                    item: order.item.en.item_name,
                    platinum: order.platinum,
                    visible: order.visible
                });
            });
            
            // - Log visibility stats
            console.log('Visibility statistics:', {
                visible: allOrders.filter(o => o.visible).length,
                invisible: allOrders.filter(o => !o.visible).length
            });

            expect(allOrders.length).toBeGreaterThan(0);
        });
    });
});