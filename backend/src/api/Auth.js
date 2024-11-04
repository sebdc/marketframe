const Url = require('../utils/Url');
const User = require('../model/User');
const WebSocket = require('ws');

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
        this.ws = null;
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

                await this.initializeWebSocket();

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
        if (this.ws) {
            this.ws.close();
        }
        this.ws = null;
        this.jwtToken = null;
        this.authToken = null;
        this.currentUser = null;
        this.profileData = null;
    }

    async initializeWebSocket() {
        return new Promise((resolve, reject) => {
            // Close existing connection if any
            if (this.ws) {
                this.ws.close();
            }

            // Extract JWT token from Authorization header
            const jwt = this.authToken.replace('JWT ', '');
            
            // Use the correct WebSocket URL with platform parameter
            const wsUrl = `wss://warframe.market/ws?platform=${this.platform}`;

            // Set up WebSocket connection with proper headers
            const wsOptions = {
                headers: {
                    Cookie: `JWT=${jwt}`,
                    Origin: 'https://warframe.market',
                    'User-Agent': 'Mozilla/5.0',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                followRedirects: true
            };

            console.log('Connecting to WebSocket:', wsUrl);
            console.log('Using JWT:', jwt);

            this.ws = new WebSocket(wsUrl, wsOptions);

            this.ws.on('open', () => {
                console.log('WebSocket connection established');
                resolve();
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log('Received WebSocket message:', message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            });

            this.ws.on('close', (code, reason) => {
                console.log('WebSocket connection closed:', { code, reason: reason.toString() });
            });

            // Set a timeout for the connection
            setTimeout(() => {
                if (this.ws.readyState !== WebSocket.OPEN) {
                    reject(new Error('WebSocket connection timeout'));
                }
            }, 5000);
        });
    }


    async setStatus(status) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            // Try to reconnect if connection is closed
            try {
                await this.initializeWebSocket();
            } catch (error) {
                throw new Error(`Failed to establish WebSocket connection: ${error.message}`);
            }
        }

        if (!['online', 'ingame', 'offline'].includes(status)) {
            throw new Error('Invalid status. Must be: online, ingame, or offline');
        }

        try {
            // Match the Python implementation's message format
            const message = {
                "type": "set_status",
                "payload": status
            };

            console.log('Sending WebSocket message:', message);
            this.ws.send(JSON.stringify(message));

            // Wait a moment and fetch profile to confirm update
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.fetchProfileData();
            
            return this.profileData.status;
        } catch (error) {
            console.error('Error updating status:', error);
            throw error;
        }
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