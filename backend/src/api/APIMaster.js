const Url = require('../utils/Url');
const User = require('../model/User');

/**
 *  @class Auth
 *  @classdesc Handles authentication-related actions
 */
class Auth {
    constructor() {
        this.jwtToken = null;
        this.authToken = null;
        this.currentUser = null;
        this.profileData = null; 
        this.platform = 'pc'; 
    }

    /**
     *  Retrieves a JWT token by making a request to the base URL
     *  Parses the 'set-cookie' header to extract the JWT token
     *
     *  @async
     *  @returns {Promise<string>} the JWT token extracted from the cookie
     *  @throws an error if the token cannot be retrieved
     */
    async getJwtToken() {
        const response = await fetch(Url.baseUrl());
        const cookies = response.headers.get('set-cookie');
        return cookies.split(';')[0].split('=')[1];
    }

    /**
     *  Signs in a user to Warframe Market using the appropriate credentials.
     *  Retrieves and stores the authorization token if the sign-in is successful.
     *
     *  @async
     *  @param {string} email - The user's Warframe Market email address.
     *  @param {string} password - The user's Warframe Market password.
     *  @param {string|null} [deviceId=null] - Optional device ID for the login.
     *  @param {string} [authType='header'] - Specifies the authorization type (default is 'header').
     *  @returns {Promise<void>} resolves if the sign-in is successful
     *  @throws {Error} an error if login fails or if the authorization token is not present in the response.
     */
    async signIn( email, password, deviceId = null, authType = 'header' ) {
        const loginUrl = Url.loginUrl();
        const loginData = {
            email,
            password,
            device_id: deviceId,
            auth_type: authType,
        };
        
        const headers = {
            'Content-Type': 'application/json',
            Authorization: await this.getJwtToken(),
        };

        try {
            const response = await fetch(loginUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(loginData),
            })

            const responseBody = await response.json();
            
            if( response.ok ) {
                this.authToken = response.headers.get('authorization');
                if( !this.authToken ) {
                    throw new Error('Authorization token not found in response headers');
                }
                this.currentUser = User.fromApiResponse(responseBody);
                // - console.log('Current User:', this.currentUser);
                // - console.log('Response body:', responseBody);

                return responseBody;
            } else {
                throw new Error(`Login failed. Status code: ${response.status}`);
            }
        } catch( error ) {
            console.error(`An error occurred during login: ${error.message}`);
            throw error;
        }
    }

    logout() {
        this.jwtToken = null;
        this.authToken = null;
        this.currentUser = null;
        this.profileData = null;
    }

    async fetchProfileData() {
        if (!this.authToken || !this.currentUser) {
            throw new Error('Must be logged in to fetch profile data');
        }

        try {
            const profileUrl = Url.buildUrl(`/profile/${this.currentUser.ingame_name}`);
            const response = await fetch(profileUrl, {
                headers: {
                    'Authorization': this.authToken,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch profile data. Status code: ${response.status}`);
            }

            const data = await response.json();
            this.profileData = data.payload.profile;
            return this.profileData;
        } catch (error) {
            console.error('Error fetching profile data:', error);
            throw error;
        }
    }





    async getCurrentStatus() {
        // Refresh profile data to get current status
        await this.fetchProfileData();
        return this.profileData.status;
    }

    getAuthToken() {
        if( !this.authToken ) {
            throw new Error('Not authenticated. Please sign in first.');
        }
        return this.authToken;
    }

    getCurrentUser() {
        if( !this.currentUser ) {
            throw new Error('No user logged in');
        }
        return this.currentUser;
    }
    
    getUsername() {
        if( !this.currentUser ) {
            throw new Error('No user logged in');
        }
        return this.currentUser.ingame_name;
    }
}

module.exports = Auth;

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

class Url {
    static API_BASE_URL = 'https://api.warframe.market/v1';

    // - Define endpoint paths as static properties
    static LOGIN = '/auth/signin';
    static PROFILE = '/profile';
    static MY_ORDERS = '/my/orders';

    /**
     *  Static methods to return the full URL for each common endpoint
     *  Usage Example: urlBuilder.loginUrl();
     */
    static baseUrl() {
        return `${this.API_BASE_URL}`;
    }

    static loginUrl() {
        return `${this.API_BASE_URL}${this.LOGIN}`;
    }

    static profileUrl() {
        return `${this.API_BASE_URL}${this.PROFILE}`;
    }

    static myOrdersUrl() {
        return `${this.API_BASE_URL}${this.MY_ORDERS}`;
    }

    /**
     *  Method to build the full URL by combining the base and the endpoint
     * 
     *  Usage Example: urlBuilder = buildUrl(UrlBuilder.LOGIN);
     */
    static buildUrl(endpoint) {
        return `${this.API_BASE_URL}${endpoint}`;
    }
}

module.exports = Url;