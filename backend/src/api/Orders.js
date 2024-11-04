const Url = require('../utils/Url');

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
}

module.exports = Orders;