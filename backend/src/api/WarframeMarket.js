const Auth = require('./Auth');
const Orders = require('./Orders');
const ItemOrder = require('../model/ItemOrder');

class WarframeMarket {
	constructor() {
		this.auth = new Auth();
		this.orders = new Orders(this.auth);
	}

	// - AUTHENTICATION FUNCTION
	async signIn( email, password, deviceId = null ) {
		await this.auth.signIn(email, password, deviceId);
	}

	async getAuthToken() {
        this.auth.getAuthToken();
    }

	// - ORDER FUNCTION
	/**
	 * 	This returns 
	 */
	async getProfileOrders( username ) {
		const [buyOrders, sellOrders] = await this.orders.getProfileOrders(username);
		return [buyOrders, sellOrders];
	}

	/**
     * Get recent orders for a specific item
     * @param {string} itemName - The name of the item to get orders for
     * @param {Object} options - Additional options for the request
     * @returns {Promise<[Array<ItemOrder>, Array<ItemOrder>]>} A tuple containing [buyOrders, sellOrders]
     */
	async getItemOrders(itemName, options = { limit: 10 }) {
		const urlName = await this.orders.searchItem(itemName);
		return await this.orders.getRecentOrders(urlName, options);
	}
}

module.exports = WarframeMarket;