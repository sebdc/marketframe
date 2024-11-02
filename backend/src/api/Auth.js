const Url = require('../utils/Url');

class Auth {
    constructor() {
        this.jwtToken = null;
        this.authToken = null;
    }

    async getJwtToken() {
        const response = await fetch(Url.baseUrl());
        const cookies = response.headers.get('set-cookie');
        return cookies.split(';')[0].split('=')[1];
    }

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

            if( response.ok ) {
                this.authToken = response.headers.get('authorization');
                if( !this.authToken ) {
                    throw new Error('Authorization token not found in response headers');
                }
            } else {
                throw new Error(`Login failed. Status code: ${response.status}`);
            }

            const data = await response.json();
            console.log(data.payload.user);

        } catch( error ) {
            console.error(`An error occurred during login: ${error.message}`);
            throw error;
        }
    }
}

module.exports = Auth;