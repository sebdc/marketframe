const Auth = require('./Auth');

class WarframeMarket {
	constructor() {
		this.auth = new Auth();
		this.profile = null;
		this.orders = null;
	}

	// AUTHENTICATION FUNCTION
	async signIn( email, password, deviceId = null ) {
		await this.auth.signIn(email, password, deviceId);
	}

}

module.exports = WarframeMarket;