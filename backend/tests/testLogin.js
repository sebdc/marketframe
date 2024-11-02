require('dotenv').config();

const WarframeMarketAPI = require('../src/lib/warframeMarketAPI');

async function testLogin() {
  const api = new WarframeMarketAPI();

  try {
    await api.signIn(EMAIL, PASSWORD);
    console.log('Login test completed successfullyt.');
  } catch (error) {
    console.error('An error occurred during the login test:', error);
  }
}

testLogin();