const Credentials = require('../src/utils/Credentials');
const WarframeMarket = require('../src/api/WarframeMarket');

const { email, password } = Credentials.credentials;

describe('Status API Tests', () => {
    let wfm;

    beforeEach(async () => {
        wfm = new WarframeMarket();
        await wfm.signIn(email, password);
    });

    describe('Status Endpoint Testing', () => {
        const testEndpoints = [
            { method: 'GET', path: '/profile/status' },
            { method: 'POST', path: '/profile/status' },
            { method: 'PUT', path: '/profile/status' },
            { method: 'PATCH', path: '/profile/status' },
            { method: 'GET', path: '/profile' },
            { method: 'GET', path: '/profile/settings/status' },
            { method: 'PUT', path: '/profile/settings/status' },
            { method: 'POST', path: '/profile/settings/status' }
        ];

        test.each(testEndpoints)('Testing $method $path', async ({ method, path }) => {
            const url = `https://api.warframe.market/v1${path}`;
            
            try {
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Authorization': wfm.auth.authToken,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: method !== 'GET' ? JSON.stringify({ status: 'online' }) : undefined
                });

                console.log(`${method} ${path}:`, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers),
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('Response data:', data);
                } else {
                    const text = await response.text();
                    console.log('Error response:', text);
                }
            } catch (error) {
                console.error(`Error with ${method} ${path}:`, error);
            }
        });
    });

    test('get profile data', async () => {
        try {
            const username = wfm.auth.currentUser.ingame_name;
            const response = await fetch(`https://api.warframe.market/v1/profile/${username}`, {
                headers: {
                    'Authorization': wfm.auth.authToken,
                    'Accept': 'application/json'
                }
            });

            console.log('Profile response:', {
                status: response.status,
                statusText: response.statusText
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Profile data:', data);
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
        }
    });
});