const Credentials = require('../src/utils/Credentials');
const WarframeMarket = require('../src/api/WarframeMarket');
const WebSocket = require('ws');

const { email, password } = Credentials.credentials;

describe('WebSocket Connection Test', () => {
    let wfm;

    beforeEach(async () => {
        wfm = new WarframeMarket();
    });

    afterEach(async () => {
        if (wfm.auth.ws) {
            wfm.auth.ws.close();
        }
    });

    test('should connect to WebSocket after login', async () => {
        // First login
        await wfm.signIn(email, password);
        
        // Log connection details
        console.log('Auth token:', wfm.auth.authToken);
        console.log('WebSocket state:', wfm.auth.ws?.readyState);

        // Wait for connection to establish
        await new Promise((resolve) => {
            if (wfm.auth.ws?.readyState === WebSocket.OPEN) {
                resolve();
            } else {
                wfm.auth.ws.once('open', resolve);
            }
        });

        expect(wfm.auth.ws.readyState).toBe(WebSocket.OPEN);
    }, 10000);

    test('should update status', async () => {
        await wfm.signIn(email, password);
        
        // Wait for connection
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to change status
        try {
            const newStatus = 'online';
            await wfm.auth.setStatus(newStatus);
            
            // Verify status changed
            const currentStatus = (await wfm.auth.fetchProfileData()).status;
            console.log('Current status:', currentStatus);
            
            expect(currentStatus).toBe(newStatus);
        } catch (error) {
            console.error('Status update error:', error);
            throw error;
        }
    }, 15000);
});