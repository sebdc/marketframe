const Auth = require('./Auth');
const Orders = require('./Orders');

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
}

module.exports = WarframeMarket;