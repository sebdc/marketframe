const Credentials = require('../src/utils/Credentials');
const WarframeMarket = require('../src/api/WarframeMarket');

const { email, password } = Credentials.credentials;

describe('User Status Tests', () => {
    let wfm;

    beforeEach(() => {
        wfm = new WarframeMarket();
    });

    describe('Status Operations', () => {
        beforeEach(async () => {
            await wfm.signIn(email, password);
        });

        test('should have userShort data after login', async () => {
            const userShort = wfm.auth.userShort;
            console.log('UserShort data:', userShort);
            
            expect(userShort).toBeDefined();
            expect(userShort).toHaveProperty('status');
            expect(userShort).toHaveProperty('ingame_name');
            expect(userShort).toHaveProperty('id');
        });

        test('should update and verify status', async () => {
            // Get initial status
            const initialStatus = wfm.auth.getCurrentStatus();
            console.log('Initial status:', initialStatus);

            // Try to update to a different status
            const newStatus = initialStatus === 'online' ? 'ingame' : 'online';
            
            try {
                const updatedStatus = await wfm.auth.setStatus(newStatus);
                console.log('Updated status:', updatedStatus);
                
                // Verify the status was updated
                const currentStatus = wfm.auth.getCurrentStatus();
                expect(currentStatus).toBe(newStatus);
            } catch (error) {
                console.error('Error details:', error);
                throw error;
            }
        });

        test('should have correct userShort structure', () => {
            const userShort = wfm.auth.userShort;
            expect(userShort).toMatchObject({
                id: expect.any(String),
                ingame_name: expect.any(String),
                status: expect.stringMatching(/^(online|ingame|offline)$/),
                region: expect.any(String),
                reputation: expect.any(Number),
                avatar: expect.any(String),
                last_seen: expect.any(String)
            });
        });
    });
});