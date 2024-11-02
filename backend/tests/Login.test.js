// - Load environment variables
require('dotenv').config({path: '../.env'});
const WarframeMarket = require('../src/api/WarframeMarket');

// - Destructure environment variables for cleaner code
const { EMAIL: email, PASSWORD: password } = process.env;

const testCases = [
	{ email: email, password: password, description: 'Valid credentials' },
	{ email: 'invalid@example.com', password: 'wrongpassword', description: 'Invalid credentials' },
	{ email: process.env.EMAIL, password: 'wrongpassword', description: 'Wrong password' },
];

// - Login test
describe('WarframeMarket Login Tests with Different Credentials', () => {
	const api = new WarframeMarket();
	test.each(testCases) (
		'Should handle login with $description',
		async( {email, password, description} ) => {
			try {
				await api.signIn( email, password );

				if( description === 'Valid credentials' ) {
					expect(api.authToken).not.toBeNull();
				} else {
					expect(api.authToken).toBeUndefined();
				}

				console.log(`Test completed for case: ${description}`);
			} catch( error ) {
				console.error('An error occured during the login test:', error );
				if( description === 'Valid credentials' ) {
					throw new Error('Expected login to succeed but it failed');
				}
			}
		}
	)
});