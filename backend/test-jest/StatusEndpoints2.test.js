const Credentials = require('../src/utils/Credentials');
const WarframeMarket = require('../src/api/WarframeMarket');

const { email, password } = Credentials.credentials;

describe('Profile API Tests', () => {
    let wfm;

    beforeEach(async () => {
        wfm = new WarframeMarket();
        await wfm.signIn(email, password);
    });

    test('examine profile response structure', async () => {
        const username = wfm.auth.currentUser.ingame_name;
        
        try {
            const profileResponse = await fetch(`https://api.warframe.market/v1/profile/${username}`, {
                headers: {
                    'Authorization': wfm.auth.authToken,
                    'Accept': 'application/json'
                }
            });
            
            const data = await profileResponse.json();
            
            console.log('\nProfile Data Structure:');
            console.log('Status Code:', profileResponse.status);
            console.log('Available top-level keys:', Object.keys(data));
            console.log('Payload keys:', Object.keys(data.payload));
            console.log('Profile keys:', Object.keys(data.payload.profile));
            console.log('\nFull profile data:', data.payload.profile);
            
            // Let's also check response headers for any clues
            console.log('\nResponse Headers:', Object.fromEntries(profileResponse.headers));

        } catch (error) {
            console.error('Profile fetch error:', error);
        }
    });

    test('try direct status setting', async () => {
        try {
            const response = await fetch('https://api.warframe.market/v1/settings/status', {
                method: 'POST',  // Try POST instead of PUT
                headers: {
                    'Authorization': wfm.auth.authToken,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'ingame'  // Using the exact status value from the schema
                })
            });

            console.log('\nStatus Update Response:');
            console.log('Status Code:', response.status);
            console.log('Headers:', Object.fromEntries(response.headers));
            
            try {
                const data = await response.json();
                console.log('Response Data:', data);
            } catch (e) {
                console.log('No JSON response');
            }

        } catch (error) {
            console.error('Status update error:', error);
        }
    });
});