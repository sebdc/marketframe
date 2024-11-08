const Url = require('../utils/Url');
const ItemOrder = require('../model/ItemOrder');

/**
 *  @class Orders
 *  @classdesc Handles order-related operations for Warframe Market
 */
class Orders {
    constructor(auth) {
        this.auth = auth;
    }

    /**
     *  Get buy and sell orders for a specific user
     * 
     *  @async
     *  @param {string} username - The username whose orders to retrieve
     *  @returns {Promise<[Array<Object>, Array<Object>]>} A tuple containing [buyOrders, sellOrders]
     *  @throws {Error} If the request fails
     */
    async getProfileOrders( username ) {
        const ordersUrl = Url.buildUrl(`/profile/${username}/orders`);
                
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        try {
            const response = await fetch(ordersUrl, {
                method: 'GET',
                headers
            });

            if( !response.ok ) {
                throw new Error(`Failed to retrieve orders. Status code: ${response.status}`);
            }

            const data = await response.json();
            
            // - Extract buy and sell orders from the payload
            const buyOrders = data.payload.buy_orders;
            const sellOrders = data.payload.sell_orders;            

            return [buyOrders, sellOrders];
            
        } catch( error ) {
            console.error(`Error retrieving orders for user ${username}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all orders (visible and invisible) for the authenticated user
     */
    async getMyOrders() {
        if( !this.auth?.authToken ) {
            throw new Error('Authentication required to view personal orders');
        }

        const username = this.auth.getUsername()
        const ordersUrl = Url.buildUrl(`/profile/${username}/orders`);

        try {
            const response = await fetch(ordersUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': this.auth.authToken
                }
            });

            if( !response.ok ) {
                throw new Error(`Failed to retrieve personal orders. Status code: ${response.status}`);
            }


            const data = await response.json();

            // - Extract buy and sell orders from the payload
            const buyOrders = data.payload.buy_orders;
            const sellOrders = data.payload.sell_orders;        

            return [buyOrders, sellOrders];
        } catch( error ) {
            console.error('Error retrieving personal orders:', error.message);
            throw error;
        }
    }

    async updateOrder( orderId, updates ) {
        if( !this.auth.authToken ) {
            throw new Error('Must be logged in to update orders');
        }

        const orderUrl = Url.buildUrl(`/profile/orders/${orderId}`);
        
        try {
            const response = await fetch(orderUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.auth.authToken
                },
                body: JSON.stringify(updates)
            });

            if( !response.ok ) {
                throw new Error(`Failed to update order. Status code: ${response.status}`);
            }

            return await response.json();
        } catch( error ) {
            console.error(`Error updating order ${orderId}: ${error.message}`);
            throw error;
        }
    }

    async deleteOrder( orderId ) {
        if( !this.auth.authToken ) {
            throw new Error('Must be logged in to delete orders');
        }

        const orderUrl = Url.buildUrl(`/profile/orders/${orderId}`);
        
        try {
            const response = await fetch(orderUrl, {
                method: 'DELETE',
                headers: { 'Authorization': this.auth.authToken }
            });

            if( !response.ok ) {
                throw new Error(`Failed to delete order. Status code: ${response.status}`);
            }

            return true;
        } catch( error ) {
            console.error(`Error deleting order ${orderId}: ${error.message}`);
            throw error;
        }
    }
    /**
     * Get recent orders for a specific item
     * @param {string} itemUrlName - The URL name of the item (e.g., "ember_prime_set")
     * @param {Object} options - Additional options for the request
     * @param {number} options.rank - The mod/arcane rank to filter by (optional)
     * @returns {Promise<[Array<ItemOrder>, Array<ItemOrder>]>} A tuple containing [buyOrders, sellOrders]
     * @throws {Error} If the request fails
     */
    async getRecentOrders(itemUrlName, options = {}) {
        const ordersUrl = Url.buildUrl(`/items/${itemUrlName}/orders`);
        
        const headers = {
            'Accept': 'application/json',
            'Platform': this.auth.platform || 'pc'
        };

        try {
            const response = await fetch(ordersUrl, {
                method: 'GET',
                headers
            });

            if (!response.ok) {
                throw new Error(`Failed to retrieve orders. Status code: ${response.status}`);
            }

            const data = await response.json();
            
            if (!Array.isArray(data?.payload?.orders)) {
                throw new Error('Invalid response format from API');
            }

            // Create ItemOrder objects
            const orders = data.payload.orders.map(order => new ItemOrder(order));

            // Filter and sort orders
            const filterOrder = (order) => {
                // Must be in-game
                if (order.user.status !== 'ingame') return false;

                // For mods and arcanes, only consider max rank
                if (options.type === 'mod' || options.type === 'arcane') {
                    if (!options.maxRank) return false;
                    const orderRank = order.mod_rank ?? 0;
                    if (orderRank !== options.maxRank) return false;
                }

                return true;
            };

            const buyOrders = orders
                .filter(order => order.order_type === 'buy' && filterOrder(order))
                .sort((a, b) => b.platinum - a.platinum); // Highest buy offers first

            const sellOrders = orders
                .filter(order => order.order_type === 'sell' && filterOrder(order))
                .sort((a, b) => a.platinum - b.platinum); // Lowest sell offers first

            return [buyOrders, sellOrders];
        } catch (error) {
            console.error(`Error retrieving orders for item ${itemUrlName}:`, error.message);
            throw error;
        }
    }

     /**
     * Search for an item by name to get its URL name
     * @param {string} itemName - The name of the item to search for
     * @returns {Promise<string>} The URL name of the item
     * @throws {Error} If the item is not found or request fails
     */
     async searchItem(itemName) {
        const searchUrl = Url.buildUrl('/items');
        
        try {
            const response = await fetch(searchUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to search items. Status code: ${response.status}`);
            }

            const data = await response.json();
            
            // Find the item that matches the search term (case-insensitive)
            const item = data.payload.items.find(item => 
                item.item_name.toLowerCase() === itemName.toLowerCase() ||
                item.url_name.toLowerCase() === itemName.toLowerCase().replace(/ /g, '_')
            );

            if (!item) {
                throw new Error(`Item "${itemName}" not found`);
            }

            return item.url_name;
        } catch (error) {
            console.error('Error searching for item:', error.message);
            throw error;
        }
    }
}

module.exports = Orders;