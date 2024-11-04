const Url = require('../src/utils/Url');

describe('Url', () => {
    
    test('Should return the correct URL for the BASE URL', () => {
        const expectedUrl = 'https://api.warframe.market/v1';
        const result = Url.baseUrl();
        expect(result).toBe(expectedUrl);
    });

    test('Should return the correct URL for LOGIN endpoint', () => {
        const expectedUrl = 'https://api.warframe.market/v1/auth/signin';
        const result = Url.loginUrl();
        expect(result).toBe(expectedUrl);
    });

    test('Should return the correct URL for PROFILE endpoint', () => {
        const expectedUrl = 'https://api.warframe.market/v1/profile';
        const result = Url.profileUrl();
        expect(result).toBe(expectedUrl);
    });

    test('Should return the correct URL for MY_ORDERS endpoint', () => {
        const expectedUrl = 'https://api.warframe.market/v1/my/orders';
        const result = Url.myOrdersUrl();
        expect(result).toBe(expectedUrl);
    });
});
