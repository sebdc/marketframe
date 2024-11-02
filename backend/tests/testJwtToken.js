const WarframeMarketAPI = require('../src/lib/warframeMarketAPI');


async function testJwtToken() {
    const api = new WarframeMarketAPI();
    api.getJwtToken()
}

testJwtToken();