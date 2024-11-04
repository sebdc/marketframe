// - Load environment variables
const Credentials = require('../src/utils/Credentials');
const WarframeMarket = require('../src/api/WarframeMarket');

// - Destructure environment variables for cleaner code
const { email, password } = Credentials.credentials;

const testCases = [
	{ email: email, password: password, description: 'Valid credentials' },
	{ email: 'invalid@example.com', password: 'wrongpassword', description: 'Invalid credentials' },
    { email: email, password: 'wrongpassword', description: 'Wrong password' },
];

// - Login test
describe('WarframeMarket Login Tests with Different Credentials', () => {
	const api = new WarframeMarket();
	test.each(testCases) (
		'Should handle login with $description',
		async( {email, password, description} ) => {
			try {
				const response = await api.signIn( email, password );
				console.log( response );
				if( description === 'Valid credentials' ) {
					expect(api.getAuthToken()).not.toBeNull();
				} else {
					expect(api.getAuthToken()).toBeUndefined();
				}
			} catch( error ) {
				console.error('An error occured during the login test:', error );
				if( description === 'Valid credentials' ) {
					throw new Error('Expected login to succeed but it failed');
				}
			}
		}
	)
});