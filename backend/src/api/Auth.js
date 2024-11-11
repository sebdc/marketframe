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

